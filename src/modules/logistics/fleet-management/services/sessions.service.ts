import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                                    from '@nestjs/typeorm';
import { Between, Repository }                                                 from 'typeorm';
import { VehicleSessionEntity, VehicleSessionStatus }                          from '../domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity }                                        from '../domain/entities/vehicle-session-location.entity';
import { VehicleSessionRouteEntity }                                           from '../domain/entities/vehicle-session-route.entity';
import { StartSessionDto }                                                     from '../domain/dto/start-session.dto';
import { FinishSessionDto }                                                    from '../domain/dto/finish-session.dto';
import { UpdateLocationDto }                                                   from '../domain/dto/update-location.dto';
import { QuerySessionDto }                                                     from '../domain/dto/query-session.dto';
import { VehiclesService }                                                     from './vehicles.service';
import { DriversService }                                                      from './drivers.service';
import { VehicleEntity, VehicleStatus }                                        from '../domain/entities/vehicle.entity';
import { FilesService }                                                        from '@modules/files/files.service';
import { GpsProviderFactoryService }                                           from '@modules/gps/services/gps-provider-factory.service';
import { GpsService }                                                          from '@modules/gps/services/gps.service';
import { OsrmService }                                                         from '@modules/gps/services/osrm.service';
import { PaginationDto }                                                       from '@shared/utils/dto/pagination.dto';
import { GenericGPS }                                                          from '@modules/gps/domain/interfaces/generic-gps.interface';
import { OsrmRoutePoint, OsrmValidationConfig }                                from '@modules/gps/domain/interfaces/osrm.interface';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(VehicleSessionEntity)
    private readonly sessionRepository: Repository<VehicleSessionEntity>,
    @InjectRepository(VehicleSessionLocationEntity)
    private readonly locationRepository: Repository<VehicleSessionLocationEntity>,
    @InjectRepository(VehicleSessionRouteEntity)
    private readonly routeRepository: Repository<VehicleSessionRouteEntity>,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly filesService: FilesService,
    private readonly gpsProviderFactoryService: GpsProviderFactoryService,
    private readonly gpsService: GpsService,
    private readonly osrmService: OsrmService,
  ) {}

  /**
   * Get route details for a session
   * @param sessionId Session ID
   * @returns Promise with route details or null
   */
  async getRouteDetails(sessionId: string): Promise<VehicleSessionRouteEntity | null> {
    return this.routeRepository.findOne({
      where: {sessionId}
    });
  }

  /**
   * Find session by ID with optional route details loading
   * @param id Session ID
   * @param userId Optional user ID for filtering
   * @param includeRouteDetails Whether to load detailed route data
   * @returns Promise with session entity
   */
  async findByIdWithRouteDetails(id: string, userId?: string, includeRouteDetails = false): Promise<VehicleSessionEntity> {
    const whereCondition: any = {id};
    if (userId) whereCondition.driverId = userId;

    const relations = [ 'vehicle', 'driver', 'locations', 'gps', 'vehicle.gpsProvider' ];
    if (includeRouteDetails) {
      relations.push('routeDetails');
    }

    const session = await this.sessionRepository.findOne({
      where: {...whereCondition},
      relations,
      order: {gps: {timestamp: 'ASC'}}
    });

    if (!session) {
      throw new NotFoundException(`Vehicle session with ID ${ id } not found`);
    }

    return session;
  }

  async findById(id: string, userId?: string): Promise<VehicleSessionEntity> {
    const whereCondition: any = {id};

    if (userId) whereCondition.driverId = userId;

    const session = await this.sessionRepository.findOne({
      where: {...whereCondition},
      relations: [ 'vehicle', 'driver', 'locations', 'gps', 'vehicle.gpsProvider', 'routeDetails' ],
      order: {gps: {timestamp: 'ASC'}}
    });

    if (!session) throw new NotFoundException(`Vehicle session with ID ${ id } not found`);

    if (session.gps.length === 0) {
      await this.fetchHistoryAndPolygon(session);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.logger.log(`Retrieved session ${ session.id }, Route details loaded: ${ !!session.routeDetails }`);

    // Generate route polygon if missing (for sessions created before OSRM integration)
    if (!session.routeDistance && session.status === VehicleSessionStatus.COMPLETED && session.endTime) {
      try {
        this.logger.log(`Generating missing route polygon for session ${ session.id }`);

        // Generate route polygon using OSRM Match service
        // Timestamp: Convert "1753735234000" → "2025-04-28T12:27:14.000Z"
        const osrmPoints: OsrmRoutePoint[] = session.gps.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: point.timestamp
        }));

        // Configure Match service options for better GPS point matching
        const matchOptions = {
          tidy: true,           // Allow input track modification for better matching quality on noisy tracks
          gaps: 'split' as const, // Split track based on timestamp gaps
          geometries: 'geojson' as const,
          overview: 'full' as const,
          steps: false,
          annotations: false
        };

        // Calculate expected values from session data instead of GPS points
        const expectedDistance = session.finalOdometer && session.initialOdometer
          ? (session.finalOdometer - session.initialOdometer) * 1000 // Convert km to meters
          : 0;

        const expectedDuration = session.endTime && session.startTime
          ? (session.endTime.getTime() - session.startTime.getTime()) / 1000 // Convert ms to seconds
          : 0;

        // Configure validation to ensure OSRM results are reasonable using session odometer data
        const validationConfig: OsrmValidationConfig = {
          enableValidation: expectedDistance > 0 && expectedDuration > 0, // Only validate if we have session data
          distanceTolerancePercent: 0.5,  // Allow 50% difference in distance
          durationTolerancePercent: 1,  // Allow 60% difference in duration (more tolerance for traffic/routing differences)
          maxRetries: 3,                  // Retry up to 3 times if validation fails
          expectedDistance: expectedDistance > 0 ? expectedDistance : undefined,
          expectedDuration: expectedDuration > 0 ? expectedDuration : undefined
        };

        this.logger.debug(`Session validation data - Expected distance: ${ expectedDistance }m, Expected duration: ${ expectedDuration }s`);

        const routeData = await this.osrmService.generateRouteFromPoints(osrmPoints, matchOptions, validationConfig);
        if (routeData) {
          // Save detailed route data to separate entity
          await this.saveRouteDetails(session.id, routeData);

          // Update session with lightweight route metadata
          await this.sessionRepository.update(session.id, {
            routeDistance: routeData.distance,
            routeDuration: routeData.duration,
            routeCoordinateCount: routeData.geometry?.coordinates?.length || 0
          });

          // Update the session object with metadata
          session.routeDistance = routeData.distance;
          session.routeDuration = routeData.duration;
          session.routeCoordinateCount = routeData.geometry?.coordinates?.length || 0;

          this.logger.log(`Successfully generated and saved route data for session ${ session.id }`);
        }
      } catch (error) {
        // Don't interrupt the main flow if there's an error generating the route
        this.logger.error(`Error generating route polygon for session ${ session.id }: ${ error.message }`, error.stack);
      }
    }

    return session;
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
    await this.fetchHistoryAndPolygon(session);

    return this.findById(savedSession.id);
  }

  private async fetchHistoryAndPolygon(session: VehicleSessionEntity) {
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

      // Process GPS history data if available and has more than 1 record
      if (historyData && historyData.length > 1) {
        this.logger.log(`Retrieved ${ historyData.length } GPS history records for session ${ session.id }`);

        // Clear existing GPS data for the session. TODO: Check if this is necessary and if it affects performance
        // await this.clearSessionGpsData(session.id);

        // Save the new GPS history data (more complete route)
        await this.saveGpsHistoryData(session.id, historyData, session.vehicle, session);

        // Generate route polygon using OSRM Match service
        try {
          const osrmPoints: OsrmRoutePoint[] = historyData.map(point => ({
            latitude: point.currentLocation.lat,
            longitude: point.currentLocation.lng,
            timestamp: +point.currentLocation.timestamp
          }));

          // Configure Match service options for better GPS point matching
          const matchOptions = {
            tidy: true,           // Allow input track modification for better matching quality on noisy tracks
            gaps: 'split' as const, // Split track based on timestamp gaps
            geometries: 'geojson' as const,
            overview: 'full' as const,
            steps: false,
            annotations: false
          };

          const routeData = await this.osrmService.generateRouteFromPoints(osrmPoints, matchOptions);
          if (routeData) {
            // Save detailed route data to separate entity
            await this.saveRouteDetails(session.id, routeData);

            // Update session with lightweight route metadata
            await this.sessionRepository.update(session.id, {
              routeDistance: routeData.distance,
              routeDuration: routeData.duration,
              routeCoordinateCount: routeData.geometry?.coordinates?.length || 0
            });

            this.logger.log(`Successfully generated and saved route data for session ${ session.id }`);
          }
        } catch (error) {
          this.logger.error(`Error generating route polygon for session ${ session.id }: ${ error.message }`, error.stack);
        }

        // Maintain compatibility by emitting events
        provider.emitGpsEvents(historyData);
      } else if (historyData && historyData.length <= 1) {
        this.logger.log(`Skipping GPS history replacement for session ${ session.id } - insufficient data (${ historyData.length } records). Keeping existing history.`);

        // Still emit events for compatibility, but don't replace existing data
        provider.emitGpsEvents(historyData);
      }
    } catch (error) {
      // Don't interrupt the main flow if there's an error retrieving GPS history
      this.logger.error(`Error retrieving GPS history for session ${ session.id }: ${ error.message }`, error.stack);
    }
  }

  /**
   * Compress route matchings data to JSON string
   * @param matchings Array of OSRM matchings
   * @returns Compressed JSON string
   */
  private compressMatchings(matchings: any[]): string {
    return JSON.stringify(matchings);
  }

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

  /**
   * Decompress route matchings data from JSON string
   * @param compressedData Compressed JSON string
   * @returns Array of OSRM matchings
   */
  private decompressMatchings(compressedData: string): any[] {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      this.logger.error(`Error decompressing matchings data: ${ error.message }`);
      return [];
    }
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

  /**
   * Save route details to separate entity
   * @param sessionId Session ID
   * @param routeData OSRM route response data
   * @returns Promise with saved route entity
   */
  private async saveRouteDetails(sessionId: string, routeData: any): Promise<VehicleSessionRouteEntity> {
    const routeEntity = new VehicleSessionRouteEntity();
    routeEntity.sessionId = sessionId;
    routeEntity.geometry = routeData.geometry;
    routeEntity.distance = routeData.distance;
    routeEntity.duration = routeData.duration;
    routeEntity.legs = routeData.legs || [];
    routeEntity.coordinateCount = routeData.geometry?.coordinates?.length || 0;

    if (routeData.allMatchings) {
      routeEntity.allMatchings = this.compressMatchings(routeData.allMatchings);
      routeEntity.totalMatchings = routeData.allMatchings.length;
    }

    return this.routeRepository.save(routeEntity);
  }

  /**
   * Save GPS history data for a session
   */
  private async saveGpsHistoryData(
    sessionId: string,
    historyData: GenericGPS[],
    vehicle: VehicleEntity,
    session: VehicleSessionEntity
  ): Promise<void> {
    try {
      for (const gpsRecord of historyData) {
        await this.gpsService.saveGps(gpsRecord, vehicle, session);
      }
      this.logger.log(`Saved ${ historyData.length } GPS history records for session ${ sessionId }`);
    } catch (error) {
      this.logger.error(`Error saving GPS history for session ${ sessionId }: ${ error.message }`, error.stack);
      throw error;
    }
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
