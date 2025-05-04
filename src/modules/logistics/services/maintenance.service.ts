import { Injectable, Logger, NotFoundException }          from '@nestjs/common';
import { InjectRepository }                               from '@nestjs/typeorm';
import { Between, MoreThan, Repository }                  from 'typeorm';
import { MaintenanceRecordEntity, MaintenanceType }       from '../domain/entities/maintenance-record.entity';
import { AlertStatus, AlertType, MaintenanceAlertEntity } from '../domain/entities/maintenance-alert.entity';
import { VehicleEntity }                                  from '../domain/entities/vehicle.entity';
import { DateTime }                                       from 'luxon';
import { MaintenanceRecordMapper }                        from '../domain/mappers/maintenance-record.mapper';
import { MaintenanceAlertMapper }                         from '../domain/mappers/maintenance-alert.mapper';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceRecordEntity)
    private readonly maintenanceRepository: Repository<MaintenanceRecordEntity>,
    @InjectRepository(MaintenanceAlertEntity)
    private readonly alertRepository: Repository<MaintenanceAlertEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>
  ) {}

  // Methods for managing maintenance records
  async createMaintenanceRecord(data: any): Promise<MaintenanceRecordMapper> {
    const record = this.maintenanceRepository.create(data as Partial<MaintenanceRecordEntity>);

    // Update the vehicle's last maintenance date
    const vehicle = await this.vehicleRepository.findOne({where: {id: data.vehicleId}});
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${ data.vehicleId } not found`);
    }

    vehicle.lastMaintenanceDate = data.date;

    // Calculate next maintenance based on type
    if (data.type === MaintenanceType.SCHEDULED || data.type === MaintenanceType.PREVENTIVE) {
      // Schedule next maintenance in 6 months or 10,000 km
      vehicle.nextMaintenanceDate = DateTime.fromISO(data.date).plus({months: 6}).toISODate();
      vehicle.nextMaintenanceKm = data.odometer + 10000;
      await this.vehicleRepository.save(vehicle);
    }

    const savedRecord = await this.maintenanceRepository.save(record);
    return MaintenanceRecordMapper.toDomain(savedRecord);
  }

  async getVehicleMaintenanceHistory(vehicleId: string): Promise<MaintenanceRecordMapper[]> {
    const records = await this.maintenanceRepository.find({
      where: {vehicleId},
      order: {date: 'DESC'}
    });
    return MaintenanceRecordMapper.toDomainAll(records);
  }

  async getMaintenanceRecord(id: string): Promise<MaintenanceRecordMapper> {
    const record = await this.maintenanceRepository.findOne({
      where: {id},
      relations: [ 'vehicle' ]
    });
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${ id } not found`);
    }
    return MaintenanceRecordMapper.toDomain(record);
  }

  async updateMaintenanceRecord(id: string, data: any): Promise<MaintenanceRecordMapper> {
    const record = await this.maintenanceRepository.findOne({where: {id}});
    if (!record) {
      throw new NotFoundException(`Maintenance record with ID ${ id } not found`);
    }
    Object.assign(record, data);
    const updatedRecord = await this.maintenanceRepository.save(record);
    return MaintenanceRecordMapper.toDomain(updatedRecord);
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const record = await this.maintenanceRepository.findOne({where: {id}});

    if (!record) throw new NotFoundException(`Maintenance record with ID ${ id } not found`);

    await this.maintenanceRepository.remove(record);
  }

  // Methods for managing maintenance alerts
  async generateMaintenanceAlerts(): Promise<void> {
    const today = DateTime.now().toISODate();
    const nextMonth = DateTime.now().plus({months: 1}).toISODate();

    // Find vehicles that need maintenance
    const vehiclesNeedingMaintenance = await this.vehicleRepository.find({
      where: [
        {nextMaintenanceDate: Between(today, nextMonth)},
        {
          lastKnownOdometer: MoreThan(0),
          nextMaintenanceKm: MoreThan(0)
        },
        {insuranceExpiry: Between(today, nextMonth)},
        {technicalInspectionExpiry: Between(today, nextMonth)},
        {circulationPermitExpiry: Between(today, nextMonth)}
      ]
    });

    for (const vehicle of vehiclesNeedingMaintenance) {
      // Check for date-based maintenance
      if (vehicle.nextMaintenanceDate && vehicle.nextMaintenanceDate >= today && vehicle.nextMaintenanceDate <= nextMonth) {
        await this.createMaintenanceAlert({
          vehicleId: vehicle.id,
          type: AlertType.DATE,
          title: `Scheduled maintenance for ${ vehicle.brand } ${ vehicle.model }`,
          description: `Vehicle with license plate ${ vehicle.licensePlate } has scheduled maintenance on ${ vehicle.nextMaintenanceDate }`,
          dueDate: vehicle.nextMaintenanceDate,
          priority: 3
        });
      }

      // Check for odometer-based maintenance
      if (vehicle.nextMaintenanceKm && vehicle.lastKnownOdometer >= (vehicle.nextMaintenanceKm - 500)) {
        await this.createMaintenanceAlert({
          vehicleId: vehicle.id,
          type: AlertType.ODOMETER,
          title: `Odometer-based maintenance for ${ vehicle.brand } ${ vehicle.model }`,
          description: `Vehicle with license plate ${ vehicle.licensePlate } is approaching ${ vehicle.nextMaintenanceKm } km for scheduled maintenance`,
          thresholdKm: vehicle.nextMaintenanceKm,
          priority: 4
        });
      }

      // Check for insurance expiry
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry >= today && vehicle.insuranceExpiry <= nextMonth) {
        await this.createMaintenanceAlert({
          vehicleId: vehicle.id,
          type: AlertType.INSURANCE,
          title: `Insurance expiry for ${ vehicle.brand } ${ vehicle.model }`,
          description: `The insurance for vehicle with license plate ${ vehicle.licensePlate } expires on ${ vehicle.insuranceExpiry }`,
          dueDate: vehicle.insuranceExpiry,
          priority: 5
        });
      }

      // Check for technical inspection expiry
      if (vehicle.technicalInspectionExpiry && vehicle.technicalInspectionExpiry >= today && vehicle.technicalInspectionExpiry <= nextMonth) {
        await this.createMaintenanceAlert({
          vehicleId: vehicle.id,
          type: AlertType.INSPECTION,
          title: `Technical inspection expiry for ${ vehicle.brand } ${ vehicle.model }`,
          description: `The technical inspection for vehicle with license plate ${ vehicle.licensePlate } expires on ${ vehicle.technicalInspectionExpiry }`,
          dueDate: vehicle.technicalInspectionExpiry,
          priority: 5
        });
      }

      // Check for circulation permit expiry
      if (vehicle.circulationPermitExpiry && vehicle.circulationPermitExpiry >= today && vehicle.circulationPermitExpiry <= nextMonth) {
        await this.createMaintenanceAlert({
          vehicleId: vehicle.id,
          type: AlertType.CIRCULATION_PERMIT,
          title: `Circulation permit expiry for ${ vehicle.brand } ${ vehicle.model }`,
          description: `The circulation permit for vehicle with license plate ${ vehicle.licensePlate } expires on ${ vehicle.circulationPermitExpiry }`,
          dueDate: vehicle.circulationPermitExpiry,
          priority: 5
        });
      }
    }
  }

  async createMaintenanceAlert(data: any): Promise<MaintenanceAlertMapper> {
    // Check if a similar active alert already exists
    const existingAlert = await this.alertRepository.findOne({
      where: {
        vehicleId: data.vehicleId,
        type: data.type,
        status: AlertStatus.ACTIVE
      },
      relations: [ 'vehicle' ]
    });

    if (existingAlert) {
      return MaintenanceAlertMapper.toDomain(existingAlert);
    }

    const alert = this.alertRepository.create(data as Partial<MaintenanceAlertEntity>);
    const savedAlert = await this.alertRepository.save(alert);

    // Load the complete alert with relations
    const completeAlert = await this.alertRepository.findOne({
      where: {id: savedAlert.id},
      relations: [ 'vehicle' ]
    });

    return MaintenanceAlertMapper.toDomain(completeAlert);
  }

  async getActiveAlerts(): Promise<MaintenanceAlertMapper[]> {
    const alerts = await this.alertRepository.find({
      where: {status: AlertStatus.ACTIVE},
      relations: [ 'vehicle' ],
      order: {priority: 'DESC', createdAt: 'ASC'}
    });
    return MaintenanceAlertMapper.toDomainAll(alerts);
  }

  async getVehicleAlerts(vehicleId: string): Promise<MaintenanceAlertMapper[]> {
    const alerts = await this.alertRepository.find({
      where: {vehicleId},
      relations: [ 'vehicle' ],
      order: {status: 'ASC', priority: 'DESC', createdAt: 'DESC'}
    });
    return MaintenanceAlertMapper.toDomainAll(alerts);
  }

  async getAlert(id: string): Promise<MaintenanceAlertMapper> {
    const alert = await this.alertRepository.findOne({
      where: {id},
      relations: [ 'vehicle' ]
    });
    if (!alert) {
      throw new NotFoundException(`Alert with ID ${ id } not found`);
    }
    return MaintenanceAlertMapper.toDomain(alert);
  }

  async updateAlertStatus(id: string, status: AlertStatus, maintenanceRecordId?: string): Promise<MaintenanceAlertMapper> {
    const alert = await this.alertRepository.findOne({
      where: {id},
      relations: [ 'vehicle' ]
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${ id } not found`);
    }

    alert.status = status;

    if (maintenanceRecordId) {
      alert.maintenanceRecordId = maintenanceRecordId;
    }

    const updatedAlert = await this.alertRepository.save(alert);
    return MaintenanceAlertMapper.toDomain(updatedAlert);
  }

  async deleteAlert(id: string): Promise<void> {
    const alert = await this.alertRepository.findOne({where: {id}});
    await this.alertRepository.remove(alert);
  }
}
