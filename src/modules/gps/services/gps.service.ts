import { Injectable, Logger }                         from '@nestjs/common';
import { InjectRepository }                           from '@nestjs/typeorm';
import { Repository }                                 from 'typeorm';
import { GpsEntity }                                  from '../domain/entities/gps.entity';
import { GenericGPS }                                 from '@modules/gps/domain/interfaces/generic-gps.interface';
import { OnEvent }                                    from '@nestjs/event-emitter';
import { VehicleEntity }                              from '@modules/logistics/fleet-management/domain/entities/vehicle.entity';
import { VehicleSessionEntity, VehicleSessionStatus } from '@modules/logistics/fleet-management/domain/entities/vehicle-session.entity';
import { BigNumber }                                  from 'bignumber.js';

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    @InjectRepository(GpsEntity) private gpsRepository: Repository<GpsEntity>,
    @InjectRepository(VehicleEntity) private vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleSessionEntity) private vehicleSessionRepository: Repository<VehicleSessionEntity>,
  ) {}

  /**
   * Save GPS data to the database
   */
  async saveGps(gpsData: GenericGPS, vehicle?: VehicleEntity, session?: VehicleSessionEntity): Promise<GpsEntity> {
    try {
      if (!session) {
        this.logger.warn(`No vehicle session found for vehicle ${ gpsData.licensePlate }`);
        return;
      }

      // Create a new GPS entity from the generic GPS data
      const gpsEntity = this.gpsRepository.create({
        licensePlate: gpsData.licensePlate,
        status: gpsData.status,
        latitude: gpsData.currentLocation.lat,
        longitude: gpsData.currentLocation.lng,
        timestamp: gpsData.currentLocation.timestamp,
        lastLocations: gpsData.lastLocations,
        speed: gpsData.speed,
        course: gpsData.course ? BigNumber(gpsData.course).integerValue().toNumber() : null,
        totalDistance: gpsData.totalDistance,
        vehicle: vehicle || null,
        vehicleSession: session || null,
        referenceId: gpsData.referenceId,
        provider: gpsData.provider || null,
      });

      // Save the entity to the database
      return await this.gpsRepository.save(gpsEntity);
    } catch (error) {
      this.logger.error(`Error saving GPS data: ${ error.message }`, error.stack);
      throw error;
    }
  }

  /**
   * Find all GPS records
   */
  async findAll(): Promise<GpsEntity[]> {
    return this.gpsRepository.find();
  }

  /**
   * Find GPS records by license plate
   */
  async findByLicensePlate(licensePlate: string): Promise<GpsEntity[]> {
    return this.gpsRepository.find({
      where: {licensePlate},
      order: {timestamp: 'DESC'},
    });
  }

  /**
   * Find the latest GPS record for a license plate
   */
  async findLatestByLicensePlate(licensePlate: string): Promise<GpsEntity | null> {
    return this.gpsRepository.findOne({
      where: {licensePlate},
      order: {timestamp: 'DESC'},
    });
  }

  /**
   * Delete all GPS records for a specific session
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      const result = await this.gpsRepository.delete({
        vehicleSession: {id: sessionId}
      });
      this.logger.log(`Deleted ${ result.affected } GPS records for session ${ sessionId }`);
    } catch (error) {
      this.logger.error(`Error deleting GPS records for session ${ sessionId }: ${ error.message }`, error.stack);
      throw error;
    }
  }

  /**
   * Find GPS records by session ID
   */
  async findBySessionId(sessionId: string): Promise<GpsEntity[]> {
    return this.gpsRepository.find({
      where: {vehicleSession: {id: sessionId}},
      order: {timestamp: 'ASC'},
    });
  }

  /**
   * Handle GPS updated event
   */
  @OnEvent('gps.updated')
  async handleGpsUpdatedEvent(gpsData: GenericGPS) {
    const currentGps = await this.gpsRepository.findOne({where: {referenceId: gpsData.referenceId, provider: gpsData.provider}});

    if (currentGps) return;

    // Check if the vehicle exists
    const vehicle: VehicleEntity = await this.vehicleRepository.findOne({where: {licensePlate: gpsData.licensePlate}});

    if (!vehicle) return;

    // Check if the vehicle session exists
    const vehicleSession = await this.vehicleSessionRepository.findOne({
      where: {
        vehicleId: vehicle.id,
        status: VehicleSessionStatus.ACTIVE
      }
    });
    if (!vehicleSession) return;

    // Check if the timestamp already registered the vehicle GPS
    const existingGps = await this.gpsRepository.findOne({
      where: {
        referenceId: gpsData.referenceId,
        licensePlate: gpsData.licensePlate,
        timestamp: gpsData.currentLocation.timestamp,
        latitude: gpsData.currentLocation.lat,
        longitude: gpsData.currentLocation.lng,
      },
    });

    if (existingGps) return;

    this.logger.log(`GPS data updated: ${ JSON.stringify(gpsData) }`);

    await this.saveGps(gpsData, vehicle, vehicleSession);
  }
}
