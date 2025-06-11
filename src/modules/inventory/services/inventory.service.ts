import { BadRequestException, Injectable }       from '@nestjs/common';
import { InjectRepository }                      from '@nestjs/typeorm';
import { FindManyOptions, Repository }           from 'typeorm';
import { EventEmitter2 }                         from '@nestjs/event-emitter';
import { InventoryItemEntity }                   from '../domain/entities/inventory-item.entity';
import { InventoryMovementEntity, MovementType } from '../domain/entities/inventory-movement.entity';
import { ProductsService }                       from '@modules/products/products.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private inventoryItemRepository: Repository<InventoryItemEntity>,
    @InjectRepository(InventoryMovementEntity)
    private inventoryMovementRepository: Repository<InventoryMovementEntity>,
    private productsService: ProductsService,
    private eventEmitter: EventEmitter2
  ) {}

  // Métodos para gestionar el inventario
  async findAll(options?: FindManyOptions<InventoryItemEntity>): Promise<InventoryItemEntity[]> {
    return this.inventoryItemRepository.find(options);
  }

  async findOne(id: string): Promise<InventoryItemEntity> {
    return this.inventoryItemRepository.findOne({where: {id}});
  }

  async create(data: any): Promise<InventoryItemEntity> {
    // Ensure name is provided
    if (!data.name) throw new BadRequestException('Name is required for inventory item');

    const item = this.inventoryItemRepository.create(data as Partial<InventoryItemEntity>);
    return this.inventoryItemRepository.save(item);
  }

  async update(id: string, data: any): Promise<InventoryItemEntity> {
    await this.inventoryItemRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.inventoryItemRepository.delete(id);
  }

  // Métodos para gestionar movimientos de inventario
  async addStock(itemId: string, quantity: number, reference?: string, metadata?: Record<string, any>, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    // Create movement record
    const movement = this.inventoryMovementRepository.create({
      inventoryItemId: itemId,
      type: MovementType.RECEIPT,
      quantity,
      reference,
      metadata,
      createdById: userId
    });
    await this.inventoryMovementRepository.save(movement);

    // Update inventory quantity
    await this.inventoryItemRepository.update(itemId, {
      quantity: item.quantity + quantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.added', {
      itemId,
      quantity,
      reference,
      metadata
    });

    return movement;
  }

  async removeStock(itemId: string, quantity: number, reference?: string, metadata?: Record<string, any>, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    if (item.quantity < quantity) {
      throw new Error(`Not enough stock for item ${ itemId }. Available: ${ item.quantity }, Requested: ${ quantity }`);
    }

    // Create movement record
    const movement = this.inventoryMovementRepository.create({
      inventoryItemId: itemId,
      type: MovementType.SHIPMENT,
      quantity,
      reference,
      metadata,
      createdById: userId
    });
    await this.inventoryMovementRepository.save(movement);

    // Update inventory quantity
    await this.inventoryItemRepository.update(itemId, {
      quantity: item.quantity - quantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.removed', {
      itemId,
      quantity,
      reference,
      metadata
    });

    return movement;
  }

  async adjustStock(itemId: string, newQuantity: number, reference?: string, metadata?: Record<string, any>, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    const adjustmentQuantity = newQuantity - item.quantity;

    // Create movement record
    const movement = this.inventoryMovementRepository.create({
      inventoryItemId: itemId,
      type: MovementType.ADJUSTMENT,
      quantity: adjustmentQuantity,
      reference,
      metadata,
      createdById: userId
    });
    await this.inventoryMovementRepository.save(movement);

    // Update inventory quantity
    await this.inventoryItemRepository.update(itemId, {
      quantity: newQuantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.adjusted', {
      itemId,
      oldQuantity: item.quantity,
      newQuantity,
      reference,
      metadata
    });

    return movement;
  }

  async transferStock(fromItemId: string, toItemId: string, quantity: number, reference?: string, metadata?: Record<string, any>, userId?: string): Promise<InventoryMovementEntity[]> {
    const fromItem = await this.findOne(fromItemId);
    if (!fromItem) {
      throw new Error(`Source inventory item with id ${ fromItemId } not found`);
    }

    const toItem = await this.findOne(toItemId);
    if (!toItem) {
      throw new Error(`Destination inventory item with id ${ toItemId } not found`);
    }

    if (fromItem.quantity < quantity) {
      throw new Error(`Not enough stock for transfer from item ${ fromItemId }. Available: ${ fromItem.quantity }, Requested: ${ quantity }`);
    }

    // Create movement records
    const fromMovement = this.inventoryMovementRepository.create({
      inventoryItemId: fromItemId,
      type: MovementType.TRANSFER,
      quantity: -quantity,
      reference,
      metadata: {...metadata, toItemId},
      createdById: userId
    });

    const toMovement = this.inventoryMovementRepository.create({
      inventoryItemId: toItemId,
      type: MovementType.TRANSFER,
      quantity,
      reference,
      metadata: {...metadata, fromItemId},
      createdById: userId
    });

    await this.inventoryMovementRepository.save([ fromMovement, toMovement ]);

    // Update inventory quantities
    await this.inventoryItemRepository.update(fromItemId, {
      quantity: fromItem.quantity - quantity
    });

    await this.inventoryItemRepository.update(toItemId, {
      quantity: toItem.quantity + quantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.transferred', {
      fromItemId,
      toItemId,
      quantity,
      reference,
      metadata
    });

    return [ fromMovement, toMovement ];
  }

  // Métodos para consultas específicas
  async getStockByProduct(upcCode: string): Promise<InventoryItemEntity[]> {
    return this.inventoryItemRepository.find({
      where: {upcCode},
      relations: [ 'warehouse' ]
    });
  }

  // New method to get stock by product name or UPC code
  async getStockByProductInfo(nameOrUpc: string): Promise<InventoryItemEntity[]> {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.warehouse', 'warehouse')
      .where('item.name LIKE :name OR item.upcCode = :upc', {
        name: `%${ nameOrUpc }%`,
        upc: nameOrUpc
      })
      .getMany();
  }

  async getStockByWarehouse(warehouseId: string): Promise<InventoryItemEntity[]> {
    return this.inventoryItemRepository.find({
      where: {warehouseId},
      relations: [ 'product' ]
    });
  }

  async getLowStockItems(): Promise<InventoryItemEntity[]> {
    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.quantity <= item.minimumStock')
      .andWhere('item.minimumStock IS NOT NULL')
      .getMany();
  }

  async getExpiringItems(daysThreshold: number): Promise<InventoryItemEntity[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.expirationDate IS NOT NULL')
      .andWhere('item.expirationDate <= :thresholdDate', {thresholdDate})
      .getMany();
  }

  // Métodos para reservas
  async reserveStock(itemId: string, quantity: number, reference?: string, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    const availableQuantity = item.quantity - (item.isReserved ? 0 : 0); // Adjust this calculation based on your reservation logic
    if (availableQuantity < quantity) {
      throw new Error(`Not enough available stock for reservation. Available: ${ availableQuantity }, Requested: ${ quantity }`);
    }

    // Create movement record
    const movement = this.inventoryMovementRepository.create({
      inventoryItemId: itemId,
      type: MovementType.RESERVATION,
      quantity,
      reference,
      createdById: userId
    });
    await this.inventoryMovementRepository.save(movement);

    // Update inventory item
    await this.inventoryItemRepository.update(itemId, {
      isReserved: true
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.reserved', {
      itemId,
      quantity,
      reference
    });

    return movement;
  }

  async releaseReservedStock(itemId: string, quantity: number, reference?: string, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    if (!item.isReserved) {
      throw new Error(`Item ${ itemId } is not reserved`);
    }

    // Create movement record
    const movement = this.inventoryMovementRepository.create({
      inventoryItemId: itemId,
      type: MovementType.RELEASE,
      quantity,
      reference,
      createdById: userId
    });
    await this.inventoryMovementRepository.save(movement);

    // Update inventory item
    await this.inventoryItemRepository.update(itemId, {
      isReserved: false
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.released', {
      itemId,
      quantity,
      reference
    });

    return movement;
  }
}
