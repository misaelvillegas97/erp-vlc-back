import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                                    from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, IsNull, Not, Raw, Repository }      from 'typeorm';
import { VehicleEntity, VehicleStatus }                                        from '../domain/entities/vehicle.entity';
import { CreateVehicleDto }                                                    from '../domain/dto/create-vehicle.dto';
import { UpdateVehicleDto }                                                    from '../domain/dto/update-vehicle.dto';
import { QueryVehicleDto }                                                     from '../domain/dto/query-vehicle.dto';
import { plainToInstance }                                                     from 'class-transformer';
import { DateTime }                                                            from 'luxon';
import { MaintenanceService }                                                  from './maintenance.service';
import { VehicleDocumentsService }                                             from './vehicle-documents.service';
import { CreateVehicleDocumentDto }                                            from '../domain/dto/create-vehicle-document.dto';
import { MaintenanceRecordMapper }                                             from '../domain/mappers/maintenance-record.mapper';
import { MaintenanceAlertMapper }                                              from '../domain/mappers/maintenance-alert.mapper';
import { VehicleDocumentMapper }                                               from '../domain/mappers/vehicle-document.mapper';
import { GPSProviderEnum }                                                     from '@modules/gps/domain/enums/provider.enum';
import { VehicleGpsProviderEntity }                                            from '@modules/logistics/fleet-management/domain/entities/vehicle-gps-provider.entity';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(VehicleEntity) private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleGpsProviderEntity) private readonly vehicleGpsProviderRepository: Repository<VehicleGpsProviderEntity>,
    private readonly maintenanceService: MaintenanceService,
    private readonly vehicleDocumentsService: VehicleDocumentsService
  ) {}

  async findAll(query: QueryVehicleDto): Promise<[ VehicleEntity[], number ]> {
    const take = query.limit || 100;
    const skip = ((query.page || 1) - 1) * take;

    const where: FindOptionsWhere<VehicleEntity> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.brand) {
      where.brand = ILike(`%${ query.brand }%`);
    }

    if (query.fuelType) {
      where.fuelType = query.fuelType;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    // Definir campo y orden de ordenamiento
    let order: any = {createdAt: 'DESC'};
    if (query.sortBy) {
      order = {[query.sortBy]: (query.sortOrder || 'DESC').toUpperCase()};
    }

    if (query.search) {
      const search = `%${ query.search }%`;
      return this.vehicleRepository.findAndCount({
        where: [
          {brand: ILike(search)},
          {model: ILike(search)},
          {licensePlate: ILike(search)},
          {vin: ILike(search)},
          {color: ILike(search)}
        ],
        take,
        skip,
        order
      });
    }

    return this.vehicleRepository.findAndCount({
      where,
      take,
      skip,
      order
    });
  }

  async findAllAvailable(): Promise<[ VehicleEntity[], number ]> {
    return this.vehicleRepository.findAndCount({
      where: {status: VehicleStatus.AVAILABLE},
      order: {brand: 'ASC', model: 'ASC'}
    });
  }

  async findById(id: string, throwError: boolean = true): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({
      where: {id},
      relations: [ 'currentSession' ]
    });
    if (!vehicle && throwError)
      throw new NotFoundException(`Vehicle with ID ${ id } not found`);

    return vehicle;
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    const vehicle = plainToInstance(VehicleEntity, createVehicleDto);

    if (createVehicleDto.lastKnownOdometer !== undefined) {
      vehicle.lastKnownOdometer = createVehicleDto.lastKnownOdometer;
    }

    if (createVehicleDto.photoUrl) {
      vehicle.photoUrl = createVehicleDto.photoUrl;
    }

    if (createVehicleDto.additionalPhotoUrls) {
      vehicle.additionalPhotoUrls = createVehicleDto.additionalPhotoUrls;
    }

    return this.vehicleRepository.save(vehicle);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);

    Object.assign(vehicle, updateVehicleDto);

    if (updateVehicleDto.lastKnownOdometer !== undefined) {
      vehicle.lastKnownOdometer = updateVehicleDto.lastKnownOdometer;
    }

    if (updateVehicleDto.photoUrl !== undefined) {
      vehicle.photoUrl = updateVehicleDto.photoUrl;
    }

    if (updateVehicleDto.additionalPhotoUrls !== undefined) {
      vehicle.additionalPhotoUrls = updateVehicleDto.additionalPhotoUrls;
    }

    return this.vehicleRepository.save(vehicle);
  }

  async updateStatus(id: string, status: VehicleStatus): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);
    vehicle.status = status;
    return this.vehicleRepository.save(vehicle);
  }

  async updateOdometer(id: string, odometer: number): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);

    if (odometer < vehicle.lastKnownOdometer) {
      throw new UnprocessableEntityException(
        'New odometer reading cannot be less than current reading'
      );
    }

    vehicle.lastKnownOdometer = odometer;
    return this.vehicleRepository.save(vehicle);
  }

  async updateLastRefuelingOdometer(id: string, odometer: number): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);
    vehicle.lastRefuelingOdometer = odometer;
    return this.vehicleRepository.save(vehicle);
  }

  async updateCurrentSession(id: string, sessionId: string | null): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);
    vehicle.currentSessionId = sessionId;

    if (sessionId) {
      vehicle.status = VehicleStatus.IN_USE;
    } else if (vehicle.status === VehicleStatus.IN_USE) {
      vehicle.status = VehicleStatus.AVAILABLE;
    }

    return this.vehicleRepository.save(vehicle);
  }

  async checkMaintenanceStatus(): Promise<VehicleEntity[]> {
    // Generate maintenance alerts
    await this.maintenanceService.generateMaintenanceAlerts();

    // Return vehicles that need maintenance
    const today = DateTime.now().toISODate();
    const nextMonth = DateTime.now().plus({months: 1}).toISODate();

    return this.vehicleRepository.find({
      where: [
        {nextMaintenanceDate: Between(today, nextMonth)},
        {
          lastKnownOdometer: Raw(alias => `${ alias } >= next_maintenance_km - 500`),
          nextMaintenanceKm: Not(IsNull())
        },
        {insuranceExpiry: Between(today, nextMonth)},
        {technicalInspectionExpiry: Between(today, nextMonth)},
        {circulationPermitExpiry: Between(today, nextMonth)}
      ]
    });
  }

  // Maintenance record methods
  async getVehicleMaintenanceHistory(vehicleId: string): Promise<MaintenanceRecordMapper[]> {
    return this.maintenanceService.getVehicleMaintenanceHistory(vehicleId);
  }

  async createMaintenanceRecord(data: any): Promise<MaintenanceRecordMapper> {
    return this.maintenanceService.createMaintenanceRecord(data);
  }

  async getMaintenanceAlerts(vehicleId?: string): Promise<MaintenanceAlertMapper[]> {
    if (vehicleId) {
      return this.maintenanceService.getVehicleAlerts(vehicleId);
    }
    return this.maintenanceService.getActiveAlerts();
  }

  // Document management methods
  async addVehicleDocument(vehicleId: string, documentDto: CreateVehicleDocumentDto): Promise<VehicleEntity> {
    return this.vehicleDocumentsService.addVehicleDocument(vehicleId, documentDto);
  }

  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocumentMapper[]> {
    return this.vehicleDocumentsService.getVehicleDocuments(vehicleId);
  }

  async removeVehicleDocument(vehicleId: string, documentId: string): Promise<VehicleEntity> {
    return this.vehicleDocumentsService.removeVehicleDocument(vehicleId, documentId);
  }

  async checkDocumentExpirations(): Promise<any[]> {
    return this.vehicleDocumentsService.checkDocumentExpirations();
  }

  async delete(id: string): Promise<void> {
    const vehicle = await this.findById(id);
    await this.vehicleRepository.remove(vehicle);
  }

  async checkVehicleGpsProvider(licensePlate: string, provider: GPSProviderEnum): Promise<boolean> {
    const vehicle = await this.vehicleRepository.findOne({
      where: {licensePlate},
      relations: [ 'gpsProvider' ]
    });

    if (!vehicle)
      throw new NotFoundException(`Vehicle with license plate ${ licensePlate } not found`);

    return vehicle.gpsProvider.provider === provider;
  }
}
