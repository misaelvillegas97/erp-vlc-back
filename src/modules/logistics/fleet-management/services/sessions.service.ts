import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                                    from '@nestjs/typeorm';
import { Between, Repository }                                                 from 'typeorm';
import { VehicleSessionEntity, VehicleSessionStatus }                          from '../domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity }                                        from '../domain/entities/vehicle-session-location.entity';
import { StartSessionDto }                                                     from '../domain/dto/start-session.dto';
import { FinishSessionDto }                                                    from '../domain/dto/finish-session.dto';
import { UpdateLocationDto }                                                   from '../domain/dto/update-location.dto';
import { QuerySessionDto }                                                     from '../domain/dto/query-session.dto';
import { VehiclesService }                                                     from './vehicles.service';
import { DriversService }                                                      from './drivers.service';
import { VehicleEntity, VehicleStatus }                                        from '../domain/entities/vehicle.entity';
import { FilesService }                                                        from '@modules/files/files.service';
import { GpsProviderFactoryService }                                           from '@modules/gps/services/gps-provider-factory.service';
import { PaginationDto }                                                       from '@shared/utils/dto/pagination.dto';

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
    private readonly filesService: FilesService,
    private readonly gpsProviderFactoryService: GpsProviderFactoryService
  ) {}

  async findAll(query: QuerySessionDto): Promise<PaginationDto<VehicleSessionEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const qb = this.sessionRepository.createQueryBuilder('session');


    // Add relations
    qb.leftJoinAndSelect('session.vehicle', 'vehicle');
    qb.leftJoinAndSelect('session.driver', 'driver');
    qb.leftJoinAndSelect('session.gps', 'gps');

    if (query.includeDetails) {
      qb.leftJoinAndSelect('session.locations', 'locations');
    }

    // Add filters
    if (query.userId) qb.where('session.driverId = :userId', {userId: query.userId});
    if (query.vehicleId) qb.andWhere('session.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    if (query.driverId) qb.andWhere('session.driverId = :driverId', {driverId: query.driverId});
    if (query.status) qb.andWhere('session.status = :status', {status: query.status});
    if (query.startDateFrom && query.startDateTo) qb.andWhere('session.startTime BETWEEN :startDateFrom AND :startDateTo', {
        startDateFrom: new Date(query.startDateFrom),
        startDateTo: new Date(query.startDateTo)
      });
    else if (query.startDateFrom) qb.andWhere('session.startTime >= :startDateFrom', {startDateFrom: new Date(query.startDateFrom)});

    if (query.search)
      qb.andWhere(
        '(vehicle.licensePlate ILIKE :search OR ' +
        'driver.firstName ILIKE :search OR ' +
        'driver.lastName ILIKE :search OR ' +
        'session.purpose ILIKE :search OR ' +
        'session.observations ILIKE :search)',
        {search: `%${ query.search }%`}
      );

    // Get total count
    let total = await qb.getCount();

    // Add ordering
    qb.orderBy('session.startTime', 'DESC');

    // Add pagination
    qb.take(limit);
    qb.skip((page - 1) * limit);

    // Cache the query for better performance
    qb.cache(30000);

    // Get results
    const [ items, count ] = await qb.getManyAndCount();

    // If count is different from total (due to pagination), update total
    if (count !== 0 && total > count) {
      total = count;
    }

    return new PaginationDto({total, page, limit, items});
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

  async findById(id: string, userId?: string): Promise<VehicleSessionEntity> {
    const whereCondition: any = {id};

    if (userId) whereCondition.driverId = userId;

    const session = await this.sessionRepository.findOne({
      where: {...whereCondition},
      relations: [ 'vehicle', 'driver', 'locations', 'gps', 'vehicle.gpsProvider' ]
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

  async findByDriverId(driverId: string, options?: { limit: number }): Promise<VehicleSessionEntity[]> {
    return this.sessionRepository.find({
      where: {driverId},
      relations: [ 'vehicle' ],
      order: {startTime: 'DESC'},
      take: options?.limit || 10
    });
  }

  async findLatestVehiclesByDriverId(driverId: string): Promise<VehicleEntity[]> {
    const sessions = await this.findByDriverId(driverId, {limit: 50}); // Only fetch the last 50 sessions

    // Extract unique vehicles from sessions
    const uniqueVehicles = new Map<string, VehicleEntity>();

    for (const session of sessions) {
      if (session.vehicle && !uniqueVehicles.has(session.vehicle.id)) {
        uniqueVehicles.set(session.vehicle.id, session.vehicle);
      }
    }

    return Array.from(uniqueVehicles.values());
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

    // Check if odometer reading is valid with a tolerance of 100 kilometers
    const odometerTolerance = 100;
    if (startSessionDto.initialOdometer < vehicle.lastKnownOdometer - odometerTolerance) {
      throw new UnprocessableEntityException(
        `Initial odometer reading (${ startSessionDto.initialOdometer }) cannot be less than vehicle's current odometer (${ vehicle.lastKnownOdometer }) minus tolerance (${ odometerTolerance } km)`
      );
    }

    // if (startSessionDto.initialOdometer > vehicle.lastKnownOdometer + odometerTolerance) {
    //   throw new UnprocessableEntityException(
    //     `Initial odometer reading (${ startSessionDto.initialOdometer }) cannot be greater than vehicle's current odometer (${ vehicle.lastKnownOdometer }) plus tolerance (${ odometerTolerance } km)`
    //   );
    // }

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

  async finishSession(id: string, finishSessionDto: FinishSessionDto): Promise<VehicleSessionEntity> {
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

    // Retrieve GPS history for the session
    try {
      // Get the GPS provider for this vehicle
      const {provider, historyConfig} = await this.gpsProviderFactoryService.getProviderForVehicle(session.vehicleId);

      // Get the GPS history for the session
      const historyData = await provider.getOneHistory(
        historyConfig.metadata.endpoint,
        historyConfig.metadata.apiKey,
        session.vehicle.licensePlate,
        session.vehicle.gpsProvider.providerId,
        session.startTime,
        session.endTime
      );

      // Process and emit GPS events if history data is available
      if (historyData && historyData.length > 0) {
        this.logger.log(`Retrieved ${ historyData.length } GPS history records for session ${ session.id }`);

        // Emit events for each GPS record
        provider.emitGpsEvents(historyData);
      }
    } catch (error) {
      // Don't interrupt the main flow if there's an error retrieving GPS history
      this.logger.error(`Error retrieving GPS history for session ${ session.id }: ${ error.message }`, error.stack);
    }

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

  async updateLocation(id: string, locationDto: UpdateLocationDto): Promise<VehicleSessionLocationEntity> {
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
