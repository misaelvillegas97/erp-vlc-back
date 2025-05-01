import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                                    from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository }                        from 'typeorm';
import { VehicleSessionEntity, VehicleSessionStatus }                          from '../domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity }                                        from '../domain/entities/vehicle-session-location.entity';
import { StartSessionDto }                                                     from '../domain/dto/start-session.dto';
import { FinishSessionDto }                                                    from '../domain/dto/finish-session.dto';
import { UpdateLocationDto }                                                   from '../domain/dto/update-location.dto';
import { QuerySessionDto }                                                     from '../domain/dto/query-session.dto';
import { VehiclesService }                                                     from './vehicles.service';
import { DriversService }                                                      from './drivers.service';
import { VehicleStatus }                                                       from '../domain/entities/vehicle.entity';
import { FilesService }                                                        from '@modules/files/files.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(VehicleSessionEntity)
    private readonly sessionRepository: Repository<VehicleSessionEntity>,
    @InjectRepository(VehicleSessionLocationEntity)
    private readonly locationRepository: Repository<VehicleSessionLocationEntity>,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly filesService: FilesService
  ) {}

  async findAll(query: QuerySessionDto): Promise<[ VehicleSessionEntity[], number ]> {
    const take = query.limit || 100;
    const skip = ((query.page || 1) - 1) * take;

    const where: FindOptionsWhere<VehicleSessionEntity> = {};
    const relations = [ 'vehicle', 'driver', 'gps' ];

    if (query.includeDetails) {
      relations.push('locations');
    }

    if (query.vehicleId) {
      where.vehicleId = query.vehicleId;
    }

    if (query.driverId) {
      where.driverId = query.driverId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDateFrom && query.startDateTo) {
      where.startTime = Between(
        new Date(query.startDateFrom),
        new Date(query.startDateTo)
      );
    } else if (query.startDateFrom) {
      where.startTime = Between(
        new Date(query.startDateFrom),
        new Date()
      );
    }

    if (query.search) {
      const search = `%${ query.search }%`;
      return this.sessionRepository.findAndCount({
        where: [
          {purpose: ILike(search)},
          {observations: ILike(search)}
        ],
        relations,
        take,
        skip,
        order: {startTime: 'DESC'}
      });
    }

    return this.sessionRepository.findAndCount({
      where,
      relations,
      take,
      skip,
      order: {startTime: 'DESC'}
    });
  }

  async findAllActive(includeDetails: boolean = false): Promise<VehicleSessionEntity[]> {
    const relations = [ 'vehicle', 'driver' ];
    if (includeDetails) {
      relations.push('locations');
    }

    return this.sessionRepository.find({
      where: {status: VehicleSessionStatus.ACTIVE},
      relations,
      order: {startTime: 'ASC'}
    });
  }

  async findById(id: string): Promise<VehicleSessionEntity> {
    const session = await this.sessionRepository.findOne({
      where: {id},
      relations: [ 'vehicle', 'driver', 'locations', 'gps' ]
    });

    if (!session) {
      throw new NotFoundException(`Vehicle session with ID ${ id } not found`);
    }

    return session;
  }

  async findByVehicleId(vehicleId: string): Promise<VehicleSessionEntity[]> {
    return this.sessionRepository.find({
      where: {vehicleId},
      relations: [ 'driver' ],
      order: {startTime: 'DESC'}
    });
  }

  async findByDriverId(driverId: string): Promise<VehicleSessionEntity[]> {
    return this.sessionRepository.find({
      where: {driverId},
      relations: [ 'vehicle' ],
      order: {startTime: 'DESC'}
    });
  }

  async startSession(startSessionDto: StartSessionDto): Promise<VehicleSessionEntity> {
    // Get vehicle and check availability
    const vehicle = await this.vehiclesService.findById(startSessionDto.vehicleId);
    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new UnprocessableEntityException({code: 'VEHICLE_NOT_AVAILABLE'});
    }

    // Get driver (user with driver role)
    const driver = await this.driversService.findById(startSessionDto.driverId);

    // Check if driver has a valid license; Activate when populate it is required
    // if (!await this.driversService.hasValidLicense(driver.id)) {
    //   throw new UnprocessableEntityException({code: 'DRIVER_LICENSE_INVALID'});
    // }

    // Check if odometer reading is valid
    if (startSessionDto.initialOdometer < vehicle.lastKnownOdometer) {
      throw new UnprocessableEntityException(
        `Initial odometer reading (${ startSessionDto.initialOdometer }) cannot be less than vehicle's current odometer (${ vehicle.lastKnownOdometer })`
      );
    }

    // Create new session
    const session = new VehicleSessionEntity();
    session.vehicleId = vehicle.id;
    session.driverId = driver.id;
    session.initialOdometer = startSessionDto.initialOdometer;
    session.startTime = new Date();
    session.purpose = startSessionDto.purpose;
    session.status = VehicleSessionStatus.ACTIVE;

    // Save session
    const savedSession = await this.sessionRepository.save(session);

    // Record initial location if provided
    if (startSessionDto.initialLocation) {
      await this.recordLocation(
        savedSession.id,
        {
          latitude: startSessionDto.initialLocation.latitude,
          longitude: startSessionDto.initialLocation.longitude
        },
        true
      );
    }

    // Update vehicle status
    await this.vehiclesService.updateStatus(vehicle.id, VehicleStatus.IN_USE);

    // Update vehicle's current odometer
    if (startSessionDto.initialOdometer > vehicle.lastKnownOdometer) {
      await this.vehiclesService.updateOdometer(vehicle.id, startSessionDto.initialOdometer);
    }

    return this.findById(savedSession.id);
  }

  async finishSession(
    id: string,
    finishSessionDto: FinishSessionDto
  ): Promise<VehicleSessionEntity> {
    // Get session
    const session = await this.findById(id);

    if (session.status !== VehicleSessionStatus.ACTIVE) {
      throw new UnprocessableEntityException(`Session is not active`);
    }

    // Check if odometer reading is valid
    if (finishSessionDto.finalOdometer < session.initialOdometer) {
      throw new UnprocessableEntityException(
        `Final odometer reading (${ finishSessionDto.finalOdometer }) cannot be less than initial odometer (${ session.initialOdometer })`
      );
    }

    // Update session
    session.endTime = new Date();
    session.finalOdometer = finishSessionDto.finalOdometer;
    session.status = VehicleSessionStatus.COMPLETED;
    session.observations = finishSessionDto.observations;
    session.incidents = finishSessionDto.incidents;

    // Process images if provided
    if (finishSessionDto.imageIds && finishSessionDto.imageIds.length > 0) {
      const images = [];
      for (const imageId of finishSessionDto.imageIds) {
        try {
          const fileInfo = await this.filesService.findById(imageId);
          if (fileInfo) {
            images.push({id: imageId, path: fileInfo.path});
          }
        } catch (error) {
          this.logger.error(`Error processing image ${ imageId }: ${ error.message }`);
        }
      }
      session.images = images;
    }

    // Save session
    const savedSession = await this.sessionRepository.save(session);

    // Record final location if provided
    if (finishSessionDto.finalLatitude && finishSessionDto.finalLongitude) {
      await this.recordLocation(
        savedSession.id,
        {
          latitude: finishSessionDto.finalLatitude,
          longitude: finishSessionDto.finalLongitude
        },
        false,
        true
      );
    }

    // Update vehicle status and odometer
    await this.vehiclesService.updateStatus(session.vehicleId, VehicleStatus.AVAILABLE);
    await this.vehiclesService.updateOdometer(session.vehicleId, finishSessionDto.finalOdometer);

    return this.findById(savedSession.id);
  }

  async cancelSession(id: string): Promise<VehicleSessionEntity> {
    // Get session
    const session = await this.findById(id);

    if (session.status !== VehicleSessionStatus.ACTIVE) {
      throw new UnprocessableEntityException(`Session is not active`);
    }

    // Update session
    session.endTime = new Date();
    session.status = VehicleSessionStatus.CANCELLED;

    // Save session
    const savedSession = await this.sessionRepository.save(session);

    // Update vehicle status
    await this.vehiclesService.updateStatus(session.vehicleId, VehicleStatus.AVAILABLE);

    return this.findById(savedSession.id);
  }

  async updateLocation(
    id: string,
    locationDto: UpdateLocationDto
  ): Promise<VehicleSessionLocationEntity> {
    // Get session
    const session = await this.findById(id);

    if (session.status !== VehicleSessionStatus.ACTIVE) {
      throw new UnprocessableEntityException(`Session is not active`);
    }

    // Record location
    return this.recordLocation(session.id, locationDto);
  }

  private async recordLocation(
    sessionId: string,
    locationData: UpdateLocationDto,
    isInitial = false,
    isFinal = false
  ): Promise<VehicleSessionLocationEntity> {
    const location = new VehicleSessionLocationEntity();
    location.sessionId = sessionId;
    location.latitude = locationData.latitude;
    location.longitude = locationData.longitude;
    location.altitude = locationData.altitude;
    location.speed = locationData.speed;
    location.accuracy = locationData.accuracy;
    location.address = locationData.address;
    location.timestamp = new Date();
    location.isInitialLocation = isInitial;
    location.isFinalLocation = isFinal;

    // Store location as standard GeoJSON in the json column
    location.geolocationJson = {
      type: 'Point',
      coordinates: [ locationData.longitude, locationData.latitude ]
    };

    return this.locationRepository.save(location);
  }

  async checkForExpiredSessions(): Promise<void> {
    // Find active sessions that haven't been updated in 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const expiredSessions = await this.sessionRepository.find({
      where: {
        status: VehicleSessionStatus.ACTIVE,
        updatedAt: Between(new Date(0), oneDayAgo)
      }
    });

    for (const session of expiredSessions) {
      this.logger.warn(`Marking session ${ session.id } as expired`);

      // Mark session as expired
      session.status = VehicleSessionStatus.EXPIRED;
      session.endTime = new Date();
      await this.sessionRepository.save(session);

      // Update vehicle status
      await this.vehiclesService.updateStatus(session.vehicleId, VehicleStatus.AVAILABLE);
    }
  }
}
