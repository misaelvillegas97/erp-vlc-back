import { BadRequestException, Injectable }       from '@nestjs/common';
import { InjectRepository }                      from '@nestjs/typeorm';
import { FindManyOptions, Repository }           from 'typeorm';
import { EventEmitter2 }                         from '@nestjs/event-emitter';
import { InventoryItemEntity }                   from '../domain/entities/inventory-item.entity';
import { InventoryMovementEntity, MovementType } from '../domain/entities/inventory-movement.entity';
import { InventoryBatchEntity }                  from '../domain/entities/inventory-batch.entity';
import { ProductsService }                       from '@modules/products/products.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private inventoryItemRepository: Repository<InventoryItemEntity>,
    @InjectRepository(InventoryMovementEntity)
    private inventoryMovementRepository: Repository<InventoryMovementEntity>,
    @InjectRepository(InventoryBatchEntity)
    private inventoryBatchRepository: Repository<InventoryBatchEntity>,
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
  async addStock(itemId: string, quantity: number, reference?: string, metadata?: Record<string, any>, userId?: string, batchNumber?: string, expirationDate?: Date): Promise<InventoryMovementEntity> {
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

    // Create a new batch for this stock addition
    const batch = this.inventoryBatchRepository.create({
      inventoryItemId: itemId,
      quantity,
      batchNumber,
      expirationDate,
      receiptDate: new Date()
    });
    await this.inventoryBatchRepository.save(batch);

    // Update inventory quantity
    await this.inventoryItemRepository.update(itemId, {
      quantity: item.quantity + quantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.added', {
      itemId,
      quantity,
      reference,
      metadata,
      batchId: batch.id
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

    // Get all batches for this item, ordered by receipt date (oldest first) - FIFO
    const batches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId},
      order: {receiptDate: 'ASC'}
    });

    // Remove stock from batches using FIFO logic
    let remainingQuantityToRemove = quantity;
    const batchUpdates = [];

    for (const batch of batches) {
      if (remainingQuantityToRemove <= 0) break;

      if (batch.quantity <= remainingQuantityToRemove) {
        // This batch will be completely consumed
        remainingQuantityToRemove -= batch.quantity;
        batchUpdates.push({
          id: batch.id,
          quantity: 0
        });
      } else {
        // This batch will be partially consumed
        batchUpdates.push({
          id: batch.id,
          quantity: batch.quantity - remainingQuantityToRemove
        });
        remainingQuantityToRemove = 0;
      }
    }

    // Update batches
    for (const update of batchUpdates) {
      await this.inventoryBatchRepository.update(update.id, {quantity: update.quantity});
    }

    // Update inventory quantity
    await this.inventoryItemRepository.update(itemId, {
      quantity: item.quantity - quantity
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.removed', {
      itemId,
      quantity,
      reference,
      metadata,
      batchUpdates
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

    // Get all batches for this item
    const batches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId},
      order: {receiptDate: 'ASC'}
    });

    // Handle batch adjustments
    if (adjustmentQuantity > 0) {
      // If we're adding stock, create a new batch for the additional quantity
      const newBatch = this.inventoryBatchRepository.create({
        inventoryItemId: itemId,
        quantity: adjustmentQuantity,
        batchNumber: metadata?.batchNumber || `ADJ-${ new Date().toISOString() }`,
        expirationDate: metadata?.expirationDate || null,
        receiptDate: new Date()
      });
      await this.inventoryBatchRepository.save(newBatch);
    } else if (adjustmentQuantity < 0) {
      // If we're removing stock, remove from oldest batches first (FIFO)
      let remainingToRemove = -adjustmentQuantity;

      for (const batch of batches) {
        if (remainingToRemove <= 0) break;

        if (batch.quantity <= remainingToRemove) {
          // This batch will be completely consumed
          remainingToRemove -= batch.quantity;
          await this.inventoryBatchRepository.update(batch.id, {quantity: 0});
        } else {
          // This batch will be partially consumed
          await this.inventoryBatchRepository.update(batch.id, {
            quantity: batch.quantity - remainingToRemove
          });
          remainingToRemove = 0;
        }
      }
    }

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

    // Get all batches for the source item, ordered by receipt date (oldest first) - FIFO
    const batches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: fromItemId},
      order: {receiptDate: 'ASC'}
    });

    // Remove stock from source batches using FIFO logic
    let remainingQuantityToRemove = quantity;
    const batchUpdates = [];
    const transferredBatches = [];

    for (const batch of batches) {
      if (remainingQuantityToRemove <= 0) break;

      if (batch.quantity <= remainingQuantityToRemove) {
        // This batch will be completely transferred
        remainingQuantityToRemove -= batch.quantity;
        batchUpdates.push({
          id: batch.id,
          quantity: 0
        });
        transferredBatches.push({
          quantity: batch.quantity,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate
        });
      } else {
        // This batch will be partially transferred
        transferredBatches.push({
          quantity: remainingQuantityToRemove,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate
        });
        batchUpdates.push({
          id: batch.id,
          quantity: batch.quantity - remainingQuantityToRemove
        });
        remainingQuantityToRemove = 0;
      }
    }

    // Update source batches
    for (const update of batchUpdates) {
      await this.inventoryBatchRepository.update(update.id, {quantity: update.quantity});
    }

    // Create new batches for the destination item
    for (const batchData of transferredBatches) {
      const newBatch = this.inventoryBatchRepository.create({
        inventoryItemId: toItemId,
        quantity: batchData.quantity,
        batchNumber: batchData.batchNumber,
        expirationDate: batchData.expirationDate,
        receiptDate: new Date() // Use current date as receipt date for the new batch
      });
      await this.inventoryBatchRepository.save(newBatch);
    }

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
      metadata,
      transferredBatches
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

  // Method to get batches for an inventory item
  async getBatchesByItemId(itemId: string): Promise<InventoryBatchEntity[]> {
    return this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId},
      order: {receiptDate: 'ASC'}
    });
  }

  // Method to get all batches with optional filtering
  async getAllBatches(options?: {
    warehouseId?: string;
    expiringBefore?: Date;
    isReserved?: boolean;
    batchNumber?: string;
  }): Promise<InventoryBatchEntity[]> {
    const queryBuilder = this.inventoryBatchRepository.createQueryBuilder('batch')
      .leftJoinAndSelect('batch.inventoryItem', 'item')
      .where('batch.quantity > 0'); // Only include batches with stock

    if (options) {
      if (options.warehouseId) {
        queryBuilder.andWhere('item.warehouseId = :warehouseId', {warehouseId: options.warehouseId});
      }

      if (options.expiringBefore) {
        queryBuilder.andWhere('batch.expirationDate IS NOT NULL AND batch.expirationDate <= :expirationDate',
          {expirationDate: options.expiringBefore});
      }

      if (options.isReserved !== undefined) {
        queryBuilder.andWhere('batch.isReserved = :isReserved', {isReserved: options.isReserved});
      }

      if (options.batchNumber) {
        queryBuilder.andWhere('batch.batchNumber LIKE :batchNumber', {batchNumber: `%${ options.batchNumber }%`});
      }
    }

    queryBuilder.orderBy('batch.receiptDate', 'ASC');

    return queryBuilder.getMany();
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

    // Get all batches for this item, ordered by receipt date (oldest first) - FIFO
    const batches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId, isReserved: false},
      order: {receiptDate: 'ASC'}
    });

    // Calculate available quantity from non-reserved batches
    const availableQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);

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

    // Reserve batches using FIFO logic
    let remainingToReserve = quantity;
    const reservedBatches = [];

    for (const batch of batches) {
      if (remainingToReserve <= 0) break;

      if (batch.quantity <= remainingToReserve) {
        // This batch will be completely reserved
        await this.inventoryBatchRepository.update(batch.id, {isReserved: true});
        reservedBatches.push(batch.id);
        remainingToReserve -= batch.quantity;
      } else {
        // This batch will be partially reserved
        // We need to split the batch into two: one reserved and one not reserved
        const reservedPortion = this.inventoryBatchRepository.create({
          inventoryItemId: itemId,
          quantity: remainingToReserve,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate,
          receiptDate: batch.receiptDate,
          isReserved: true
        });
        await this.inventoryBatchRepository.save(reservedPortion);
        reservedBatches.push(reservedPortion.id);

        // Update the original batch with reduced quantity
        await this.inventoryBatchRepository.update(batch.id, {
          quantity: batch.quantity - remainingToReserve
        });

        remainingToReserve = 0;
      }
    }

    // Update inventory item
    await this.inventoryItemRepository.update(itemId, {
      isReserved: true
    });

    // Emit event
    this.eventEmitter.emit('inventory.stock.reserved', {
      itemId,
      quantity,
      reference,
      reservedBatches
    });

    return movement;
  }

  async releaseReservedStock(itemId: string, quantity: number, reference?: string, userId?: string): Promise<InventoryMovementEntity> {
    const item = await this.findOne(itemId);
    if (!item) {
      throw new Error(`Inventory item with id ${ itemId } not found`);
    }

    // Get all reserved batches for this item
    const reservedBatches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId, isReserved: true},
      order: {receiptDate: 'ASC'} // FIFO order
    });

    if (reservedBatches.length === 0) {
      throw new Error(`No reserved batches found for item ${ itemId }`);
    }

    // Calculate total reserved quantity
    const totalReservedQuantity = reservedBatches.reduce((sum, batch) => sum + batch.quantity, 0);

    if (totalReservedQuantity < quantity) {
      throw new Error(`Not enough reserved stock to release. Reserved: ${ totalReservedQuantity }, Requested: ${ quantity }`);
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

    // Release batches
    let remainingToRelease = quantity;
    const releasedBatches = [];

    for (const batch of reservedBatches) {
      if (remainingToRelease <= 0) break;

      if (batch.quantity <= remainingToRelease) {
        // This batch will be completely released
        await this.inventoryBatchRepository.update(batch.id, {isReserved: false});
        releasedBatches.push(batch.id);
        remainingToRelease -= batch.quantity;
      } else {
        // This batch will be partially released
        // We need to split the batch into two: one released and one still reserved
        const releasedPortion = this.inventoryBatchRepository.create({
          inventoryItemId: itemId,
          quantity: remainingToRelease,
          batchNumber: batch.batchNumber,
          expirationDate: batch.expirationDate,
          receiptDate: batch.receiptDate,
          isReserved: false
        });
        await this.inventoryBatchRepository.save(releasedPortion);
        releasedBatches.push(releasedPortion.id);

        // Update the original batch with reduced quantity
        await this.inventoryBatchRepository.update(batch.id, {
          quantity: batch.quantity - remainingToRelease
        });

        remainingToRelease = 0;
      }
    }

    // Check if there are still reserved batches
    const remainingReservedBatches = await this.inventoryBatchRepository.find({
      where: {inventoryItemId: itemId, isReserved: true}
    });

    // Update inventory item's isReserved flag if no more reserved batches
    if (remainingReservedBatches.length === 0) {
      await this.inventoryItemRepository.update(itemId, {
        isReserved: false
      });
    }

    // Emit event
    this.eventEmitter.emit('inventory.stock.released', {
      itemId,
      quantity,
      reference,
      releasedBatches
    });

    return movement;
  }
}
