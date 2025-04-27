import { Injectable, Logger }                         from '@nestjs/common';
import { InjectRepository }                           from '@nestjs/typeorm';
import { Repository }                                 from 'typeorm';
import { GpsEntity }                                  from '../domain/entities/gps.entity';
import { GenericGPS }                                 from '@modules/logistics/domain/interfaces/generic-gps.interface';
import { OnEvent }                                    from '@nestjs/event-emitter';
import { VehicleEntity }                              from '@modules/logistics/domain/entities/vehicle.entity';
import { VehicleSessionEntity, VehicleSessionStatus } from '@modules/logistics/domain/entities/vehicle-session.entity';

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
      // Create a new GPS entity from the generic GPS data
      const gpsEntity = this.gpsRepository.create({
        licensePlate: gpsData.licensePlate,
        status: gpsData.status,
        lat: gpsData.currentLocation.lat,
        lng: gpsData.currentLocation.lng,
        timestamp: gpsData.currentLocation.timestamp,
        lastLocations: gpsData.lastLocations,
        speed: gpsData.speed,
        totalDistance: gpsData.totalDistance,
        vehicle: vehicle || null,
        vehicleSession: session || null,
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
   * Handle GPS updated event
   */
  @OnEvent('gps.updated')
  async handleGpsUpdatedEvent(gpsData: GenericGPS) {
    this.logger.debug(`Received GPS update for vehicle: ${ gpsData.licensePlate }`);

    // Check if the vehicle exists
    const vehicle = await this.vehicleRepository.findOne({where: {licensePlate: gpsData.licensePlate}});
    if (!vehicle) return;

    this.logger.debug(`Vehicle found: ${ vehicle.id } - ${ vehicle.licensePlate }`);

    // Check if the vehicle session exists
    const vehicleSession = await this.vehicleSessionRepository.findOne({
      where: {
        vehicleId: vehicle.id,
        status: VehicleSessionStatus.ACTIVE
      },
      relations: [ 'vehicle' ]
    });
    if (!vehicleSession) {
      this.logger.warn(`Vehicle session not found for vehicle: ${ gpsData.licensePlate }`);
      return;
    }

    this.logger.debug(`Vehicle session found: ${ vehicleSession.id } - ${ vehicleSession.vehicle.licensePlate }`);

    // Check if the timestamp already registered the vehicle GPS
    const existingGps = await this.gpsRepository.findOne({
      where: {
        licensePlate: gpsData.licensePlate,
        timestamp: gpsData.currentLocation.timestamp,
      },
    });

    if (existingGps) return;

    await this.saveGps(gpsData, vehicle, vehicleSession);
  }
}
