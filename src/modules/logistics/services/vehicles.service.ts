import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                                    from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere }                                 from 'typeorm';
import { VehicleEntity, VehicleStatus }                                        from '../domain/entities/vehicle.entity';
import { CreateVehicleDto }                                                    from '../domain/dto/create-vehicle.dto';
import { UpdateVehicleDto }                                                    from '../domain/dto/update-vehicle.dto';
import { QueryVehicleDto }                                                     from '../domain/dto/query-vehicle.dto';
import { FilesService }                                                        from '@modules/files/files.service';
import { plainToInstance }                                                     from 'class-transformer';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    private readonly filesService: FilesService
  ) {}

  async findAll(query: QueryVehicleDto): Promise<[ VehicleEntity[], number ]> {
    const take = query.limit || 10;
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

    if (query.search) {
      const search = `%${ query.search }%`;
      return this.vehicleRepository.findAndCount({
        where: [
          {brand: ILike(search)},
          {model: ILike(search)},
          {licensePlate: ILike(search)},
          {vin: ILike(search)}
        ],
        take,
        skip,
        order: {createdAt: 'DESC'}
      });
    }

    return this.vehicleRepository.findAndCount({
      where,
      take,
      skip,
      order: {createdAt: 'DESC'}
    });
  }

  async findAllAvailable(): Promise<VehicleEntity[]> {
    return this.vehicleRepository.find({
      where: {status: VehicleStatus.AVAILABLE},
      order: {brand: 'ASC', model: 'ASC'}
    });
  }

  async findById(id: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({where: {id}});
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${ id } not found`);
    }
    return vehicle;
  }

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    const vehicle = plainToInstance(VehicleEntity, createVehicleDto);

    // Process images if provided
    if (createVehicleDto.imageIds && createVehicleDto.imageIds.length > 0) {
      await this.processImages(vehicle, createVehicleDto.imageIds);
    }

    return this.vehicleRepository.save(vehicle);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleEntity> {
    const vehicle = await this.findById(id);

    // Update the vehicle with new data
    Object.assign(vehicle, updateVehicleDto);

    // Process images if provided
    if (updateVehicleDto.imageIds) {
      await this.processImages(vehicle, updateVehicleDto.imageIds);
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

    if (odometer < vehicle.currentOdometer) {
      throw new UnprocessableEntityException(
        'New odometer reading cannot be less than current reading'
      );
    }

    vehicle.currentOdometer = odometer;
    return this.vehicleRepository.save(vehicle);
  }

  async delete(id: string): Promise<void> {
    const vehicle = await this.findById(id);
    await this.vehicleRepository.remove(vehicle);
  }

  private async processImages(vehicle: VehicleEntity, imageIds: string[]): Promise<void> {
    const images = [];

    for (const imageId of imageIds) {
      try {
        const fileInfo = await this.filesService.findById(imageId);
        if (fileInfo) {
          images.push({id: imageId, path: fileInfo.path});
        }
      } catch (error) {
        this.logger.error(`Error processing image ${ imageId }: ${ error.message }`);
      }
    }

    vehicle.images = images;
  }
}
