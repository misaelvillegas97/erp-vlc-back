import { Injectable }          from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { WarehouseEntity }     from '../domain/entities/warehouse.entity';
import { WarehouseZoneEntity } from '../domain/entities/warehouse-zone.entity';
import { CreateWarehouseDto }  from '@modules/inventory/domain/dto/create-warehouse.dto';
import { PaginationDto }       from '@shared/utils/dto/pagination.dto';
import { QueryWarehouseDto }   from '@modules/inventory/domain/dto/query-warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(WarehouseZoneEntity)
    private warehouseZoneRepository: Repository<WarehouseZoneEntity>
  ) {}

  // Métodos para gestionar almacenes
  async findAll(query?: QueryWarehouseDto): Promise<PaginationDto<WarehouseEntity>> {
    const {page = 1, limit = 10} = query;
    const qb = this.warehouseRepository.createQueryBuilder('warehouse');

    qb.leftJoinAndSelect('warehouse.zones', 'zone');

    if (query.name) {
      qb.andWhere('warehouse.name ILIKE :name', {name: `%${ query.name }%`});
    }

    if (query.isActive !== undefined) {
      qb.andWhere('warehouse.isActive = :isActive', {isActive: query.isActive});
    }

    if (query.contactPerson) {
      qb.andWhere('warehouse.contactPerson ILIKE :contactPerson', {contactPerson: `%${ query.contactPerson }%`});
    }

    qb.orderBy('warehouse.name', 'ASC');
    qb.addOrderBy('zone.name', 'ASC');

    const total = await qb.getCount();

    qb.take(query.limit);
    qb.skip((query.page - 1) * query.limit);
    qb.cache(30000); // Cache for 30 seconds

    const warehouses = await qb.getMany();

    return new PaginationDto<WarehouseEntity>({total, page, limit, items: warehouses});
  }

  async findOne(id: string): Promise<WarehouseEntity> {
    return this.warehouseRepository.findOne({
      where: {id},
      relations: [ 'zones' ]
    });
  }

  async create(data: CreateWarehouseDto): Promise<WarehouseEntity> {
    const warehouse = this.warehouseRepository.create(data);

    console.log('Creating warehouse with data:', data);
    return this.warehouseRepository.save(warehouse);
  }

  async update(id: string, data: any): Promise<WarehouseEntity> {
    await this.warehouseRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.warehouseRepository.delete(id);
  }

  // Métodos para gestionar zonas de almacén
  async findAllZones(warehouseId: string): Promise<WarehouseZoneEntity[]> {
    return this.warehouseZoneRepository.find({
      where: {warehouseId}
    });
  }

  async findOneZone(id: string): Promise<WarehouseZoneEntity> {
    return this.warehouseZoneRepository.findOne({
      where: {id},
      relations: [ 'warehouse' ]
    });
  }

  async createZone(data: any): Promise<WarehouseZoneEntity> {
    const zone = this.warehouseZoneRepository.create(data as Partial<WarehouseZoneEntity>);
    return this.warehouseZoneRepository.save(zone);
  }

  async updateZone(id: string, data: any): Promise<WarehouseZoneEntity> {
    await this.warehouseZoneRepository.update(id, data);
    return this.findOneZone(id);
  }

  async deleteZone(id: string): Promise<void> {
    await this.warehouseZoneRepository.delete(id);
  }
}
