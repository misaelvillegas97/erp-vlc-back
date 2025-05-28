import { Injectable }          from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { WarehouseEntity }     from '../domain/entities/warehouse.entity';
import { WarehouseZoneEntity } from '../domain/entities/warehouse-zone.entity';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(WarehouseZoneEntity)
    private warehouseZoneRepository: Repository<WarehouseZoneEntity>
  ) {}

  // Métodos para gestionar almacenes
  async findAll(): Promise<WarehouseEntity[]> {
    return this.warehouseRepository.find();
  }

  async findOne(id: string): Promise<WarehouseEntity> {
    return this.warehouseRepository.findOne({
      where: {id},
      relations: [ 'zones' ]
    });
  }

  async create(data: any): Promise<WarehouseEntity> {
    const warehouse = this.warehouseRepository.create(data as Partial<WarehouseEntity>);
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
