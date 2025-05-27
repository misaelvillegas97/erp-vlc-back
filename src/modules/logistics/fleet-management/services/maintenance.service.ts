import { Injectable, Logger, NotFoundException }                       from '@nestjs/common';
import { InjectDataSource, InjectRepository }                          from '@nestjs/typeorm';
import { Between, DataSource, MoreThan, Repository }                   from 'typeorm';
import { MaintenanceRecordEntity, MaintenanceStatus, MaintenanceType } from '../domain/entities/maintenance-record.entity';
import { AlertStatus, AlertType, MaintenanceAlertEntity }              from '../domain/entities/maintenance-alert.entity';
import { VehicleEntity }                                               from '../domain/entities/vehicle.entity';
import { DateTime }                                                    from 'luxon';
import { MaintenanceRecordMapper }                                     from '../domain/mappers/maintenance-record.mapper';
import { MaintenanceAlertMapper }                                      from '../domain/mappers/maintenance-alert.mapper';
import { QueryMaintenanceDto }                                         from '../domain/dto/query-maintenance.dto';
import { IPaginationOptions }                                          from '@shared/utils/types/pagination-options';
import { PaginationDto }                                               from '@shared/utils/dto/pagination.dto';
import { MaintenanceStatisticsDto }                                    from '../domain/dto/maintenance-statistics.dto';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
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

  async findAllMaintenanceRecords(query: QueryMaintenanceDto, {
    page,
    limit
  }: IPaginationOptions): Promise<PaginationDto<MaintenanceRecordEntity>> {
    const qb = this.maintenanceRepository.createQueryBuilder('maintenance');

    qb.leftJoinAndSelect('maintenance.vehicle', 'vehicle');

    if (query.type) {
      qb.andWhere('maintenance.type = :type', {type: query.type});
    }

    if (query.status) {
      qb.andWhere('maintenance.status = :status', {status: query.status});
    }

    if (query.vehicleId) {
      qb.andWhere('maintenance.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    }

    if (query.provider) {
      qb.andWhere('maintenance.provider ilike :provider', {provider: `%${ query.provider }%`});
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('maintenance.date BETWEEN :startDate AND :endDate', {startDate: query.startDate, endDate: query.endDate});
    } else if (query.startDate) {
      qb.andWhere('maintenance.date >= :startDate', {startDate: query.startDate});
    } else if (query.endDate) {
      qb.andWhere('maintenance.date <= :endDate', {endDate: query.endDate});
    }

    if (query.search) {
      qb.andWhere('(maintenance.description ilike :search OR maintenance.provider ilike :search OR maintenance.notes ilike :search)',
        {search: `%${ query.search }%`});
    }

    let total = await qb.getCount();

    // Define sort field and order
    if (query.sortBy) {
      qb.orderBy(`maintenance.${ query.sortBy }`, query.sortOrder || 'DESC');
    } else {
      qb.orderBy('maintenance.date', 'DESC');
    }

    qb.take(limit);
    qb.skip((page - 1) * limit);
    qb.cache(30_000);

    const [ records, count ] = await qb.getManyAndCount();

    if (count !== 0 && total > count) {
      total = count;
    }

    return new PaginationDto({total, page, limit, items: records});
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

  async getMaintenanceStatistics(): Promise<MaintenanceStatisticsDto> {
    const today = DateTime.now().toISODate();
    const nextMonth = DateTime.now().plus({months: 1}).toISODate();

    // Get pending maintenance records
    const pendingMaintenanceCount = await this.maintenanceRepository.count({
      where: {status: MaintenanceStatus.PENDING}
    });

    // Get completed maintenance records
    const completedMaintenanceCount = await this.maintenanceRepository.count({
      where: {status: MaintenanceStatus.COMPLETED}
    });

    // Get active alerts
    const activeAlerts = await this.alertRepository.find({
      where: {status: AlertStatus.ACTIVE},
      relations: [ 'vehicle' ]
    });
    const activeAlertsCount = activeAlerts.length;

    // Get upcoming maintenance records (due in the next month)
    const upcomingMaintenanceCount = await this.vehicleRepository.count({
      where: {nextMaintenanceDate: Between(today, nextMonth)}
    });

    // Get maintenance records by status
    const statusCounts = await this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .select('maintenance.status', 'status')
      .addSelect('COUNT(maintenance.id)', 'count')
      .groupBy('maintenance.status')
      .getRawMany();

    // Ensure all possible status values are included
    const maintenanceByStatus = Object.values(MaintenanceStatus).map(status => {
      const found = statusCounts.find(item => item.status === status);
      return {
        status,
        count: found ? parseInt(found.count) : 0
      };
    });

    // Generate next 12 months from current month
    const currentDate = DateTime.now();
    const next12Months = Array.from({length: 12}, (_, i) => {
      const date = currentDate.plus({months: i});
      return date.toFormat('yyyy-MM');
    });

    // Get maintenance records by month
    const monthCounts = await this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .select('TO_CHAR(maintenance.date, \'YYYY-MM\')', 'month')
      .addSelect('COUNT(maintenance.id)', 'count')
      .groupBy('TO_CHAR(maintenance.date, \'YYYY-MM\')')
      .orderBy('TO_CHAR(maintenance.date, \'YYYY-MM\')', 'ASC')
      .getRawMany();

    // Ensure all next 12 months are included
    const maintenanceByMonth = next12Months.map(month => {
      const found = monthCounts.find(item => item.month === month);
      return {
        month,
        count: found ? parseInt(found.count) : 0
      };
    });

    // Get maintenance records by type
    const typeCounts = await this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .select('maintenance.type', 'type')
      .addSelect('COUNT(maintenance.id)', 'count')
      .groupBy('maintenance.type')
      .getRawMany();

    // Ensure all possible type values are included
    const maintenanceByType = Object.values(MaintenanceType).map(type => {
      const found = typeCounts.find(item => item.type === type);
      return {
        type,
        count: found ? parseInt(found.count) : 0
      };
    });

    // Get upcoming maintenance records by vehicle and month
    const vehicleMonthCounts = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .select('TO_CHAR(vehicle.next_maintenance_date, \'YYYY-MM\')', 'month')
      .addSelect('COUNT(vehicle.id)', 'vehicleCount')
      .where('vehicle.next_maintenance_date IS NOT NULL')
      .andWhere('vehicle.next_maintenance_date >= :today', {today})
      .groupBy('TO_CHAR(vehicle.next_maintenance_date, \'YYYY-MM\')')
      .orderBy('TO_CHAR(vehicle.next_maintenance_date, \'YYYY-MM\')', 'ASC')
      .getRawMany();

    // Ensure all next 12 months are included for vehicle maintenance
    const upcomingMaintenanceByVehicle = next12Months.map(month => {
      const found = vehicleMonthCounts.find(item => item.month === month);
      return {
        month,
        vehicleCount: found ? parseInt(found.vehicleCount) : 0
      };
    });

    return {
      pendingMaintenanceCount,
      completedMaintenanceCount,
      activeAlertsCount,
      upcomingMaintenanceCount,
      maintenanceByStatus,
      maintenanceByMonth,
      maintenanceByType,
      upcomingMaintenanceByVehicle,
      activeAlerts: MaintenanceAlertMapper.toDomainAll(activeAlerts)
    };
  }
}
