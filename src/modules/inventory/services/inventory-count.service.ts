import { Injectable }                        from '@nestjs/common';
import { InjectRepository }                  from '@nestjs/typeorm';
import { Repository }                        from 'typeorm';
import { EventEmitter2 }                     from '@nestjs/event-emitter';
import { CountStatus, InventoryCountEntity } from '../domain/entities/inventory-count.entity';
import { InventoryCountItemEntity }          from '../domain/entities/inventory-count-item.entity';
import { InventoryItemEntity }               from '../domain/entities/inventory-item.entity';
import { InventoryService }                  from './inventory.service';

@Injectable()
export class InventoryCountService {
  constructor(
    @InjectRepository(InventoryCountEntity)
    private inventoryCountRepository: Repository<InventoryCountEntity>,
    @InjectRepository(InventoryCountItemEntity)
    private inventoryCountItemRepository: Repository<InventoryCountItemEntity>,
    @InjectRepository(InventoryItemEntity)
    private inventoryItemRepository: Repository<InventoryItemEntity>,
    private inventoryService: InventoryService,
    private eventEmitter: EventEmitter2
  ) {}

  // Métodos para gestionar conteos de inventario
  async findAll(): Promise<InventoryCountEntity[]> {
    return this.inventoryCountRepository.find({
      relations: [ 'warehouse', 'assignedTo' ]
    });
  }

  async findOne(id: string): Promise<InventoryCountEntity> {
    return this.inventoryCountRepository.findOne({
      where: {id},
      relations: [ 'warehouse', 'assignedTo', 'items', 'items.inventoryItem' ]
    });
  }

  async create(data: any): Promise<InventoryCountEntity> {
    const count = this.inventoryCountRepository.create(data as Partial<InventoryCountEntity>);
    return this.inventoryCountRepository.save(count);
  }

  async update(id: string, data: any): Promise<InventoryCountEntity> {
    await this.inventoryCountRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.inventoryCountRepository.delete(id);
  }

  // Métodos para gestionar estados de conteos
  async startCount(id: string): Promise<InventoryCountEntity> {
    const count = await this.findOne(id);
    if (!count) {
      throw new Error(`Inventory count with id ${ id } not found`);
    }

    if (count.status !== CountStatus.PLANNED) {
      throw new Error(`Cannot start count with status ${ count.status }`);
    }

    await this.inventoryCountRepository.update(id, {
      status: CountStatus.IN_PROGRESS
    });

    const updatedCount = await this.findOne(id);
    this.eventEmitter.emit('inventory.count.started', updatedCount);

    return updatedCount;
  }

  async completeCount(id: string): Promise<InventoryCountEntity> {
    const count = await this.findOne(id);
    if (!count) {
      throw new Error(`Inventory count with id ${ id } not found`);
    }

    if (count.status !== CountStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete count with status ${ count.status }`);
    }

    await this.inventoryCountRepository.update(id, {
      status: CountStatus.COMPLETED,
      completedDate: new Date()
    });

    const updatedCount = await this.findOne(id);
    this.eventEmitter.emit('inventory.count.completed', updatedCount);

    return updatedCount;
  }

  async cancelCount(id: string): Promise<InventoryCountEntity> {
    const count = await this.findOne(id);
    if (!count) {
      throw new Error(`Inventory count with id ${ id } not found`);
    }

    if (count.status === CountStatus.COMPLETED) {
      throw new Error(`Cannot cancel a completed count`);
    }

    await this.inventoryCountRepository.update(id, {
      status: CountStatus.CANCELLED
    });

    const updatedCount = await this.findOne(id);
    this.eventEmitter.emit('inventory.count.cancelled', updatedCount);

    return updatedCount;
  }

  // Métodos para gestionar items de conteo
  async addCountItem(countId: string, data: any): Promise<InventoryCountItemEntity> {
    const count = await this.findOne(countId);
    if (!count) {
      throw new Error(`Inventory count with id ${ countId } not found`);
    }

    if (count.status === CountStatus.COMPLETED || count.status === CountStatus.CANCELLED) {
      throw new Error(`Cannot add items to a count with status ${ count.status }`);
    }

    // Check if the inventory item exists
    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: {id: data.inventoryItemId}
    });

    if (!inventoryItem) {
      throw new Error(`Inventory item with id ${ data.inventoryItemId } not found`);
    }

    // Check if this item is already in the count
    const existingItem = await this.inventoryCountItemRepository.findOne({
      where: {
        inventoryCountId: countId,
        inventoryItemId: data.inventoryItemId
      }
    });

    if (existingItem) {
      throw new Error(`Item with id ${ data.inventoryItemId } is already in this count`);
    }

    // Create the count item with expected quantity from current inventory
    const countItem = this.inventoryCountItemRepository.create({
      inventoryCountId: countId,
      inventoryItemId: data.inventoryItemId,
      expectedQuantity: inventoryItem.quantity,
      countedQuantity: data.countedQuantity || null,
      notes: data.notes
    });

    // If counted quantity is provided, calculate discrepancy
    if (data.countedQuantity !== undefined && data.countedQuantity !== null) {
      countItem.discrepancy = data.countedQuantity - inventoryItem.quantity;
    }

    const savedItem = await this.inventoryCountItemRepository.save(countItem);
    this.eventEmitter.emit('inventory.count.item.added', savedItem);

    return savedItem;
  }

  async updateCountItem(itemId: string, data: any): Promise<InventoryCountItemEntity> {
    const countItem = await this.inventoryCountItemRepository.findOne({
      where: {id: itemId},
      relations: [ 'inventoryCount' ]
    });

    if (!countItem) {
      throw new Error(`Inventory count item with id ${ itemId } not found`);
    }

    if (countItem.inventoryCount.status === CountStatus.COMPLETED || countItem.inventoryCount.status === CountStatus.CANCELLED) {
      throw new Error(`Cannot update items in a count with status ${ countItem.inventoryCount.status }`);
    }

    // If counted quantity is provided, recalculate discrepancy
    if (data.countedQuantity !== undefined && data.countedQuantity !== null) {
      data.discrepancy = data.countedQuantity - countItem.expectedQuantity;
    }

    await this.inventoryCountItemRepository.update(itemId, data);

    const updatedItem = await this.inventoryCountItemRepository.findOne({
      where: {id: itemId},
      relations: [ 'inventoryCount', 'inventoryItem' ]
    });

    this.eventEmitter.emit('inventory.count.item.updated', updatedItem);

    return updatedItem;
  }

  async deleteCountItem(itemId: string): Promise<void> {
    const countItem = await this.inventoryCountItemRepository.findOne({
      where: {id: itemId},
      relations: [ 'inventoryCount' ]
    });

    if (!countItem) {
      throw new Error(`Inventory count item with id ${ itemId } not found`);
    }

    if (countItem.inventoryCount.status === CountStatus.COMPLETED || countItem.inventoryCount.status === CountStatus.CANCELLED) {
      throw new Error(`Cannot delete items from a count with status ${ countItem.inventoryCount.status }`);
    }

    await this.inventoryCountItemRepository.delete(itemId);
    this.eventEmitter.emit('inventory.count.item.deleted', {id: itemId});
  }

  // Métodos para procesar resultados de conteo
  async processCountResults(countId: string): Promise<void> {
    const count = await this.findOne(countId);
    if (!count) {
      throw new Error(`Inventory count with id ${ countId } not found`);
    }

    if (count.status !== CountStatus.IN_PROGRESS) {
      throw new Error(`Cannot process results for a count with status ${ count.status }`);
    }

    // Check if all items have been counted
    const uncountedItems = count.items.filter(item => item.countedQuantity === null);
    if (uncountedItems.length > 0) {
      throw new Error(`Cannot process results: ${ uncountedItems.length } items have not been counted yet`);
    }

    // Calculate discrepancies for all items
    for (const item of count.items) {
      await this.inventoryCountItemRepository.update(item.id, {
        discrepancy: item.countedQuantity - item.expectedQuantity
      });
    }

    this.eventEmitter.emit('inventory.count.results.processed', count);
  }

  async applyCountAdjustments(countId: string, userId?: string): Promise<any[]> {
    const count = await this.findOne(countId);
    if (!count) {
      throw new Error(`Inventory count with id ${ countId } not found`);
    }

    if (count.status !== CountStatus.IN_PROGRESS && count.status !== CountStatus.COMPLETED) {
      throw new Error(`Cannot apply adjustments for a count with status ${ count.status }`);
    }

    const adjustments = [];

    // Apply adjustments for each item with a discrepancy
    for (const item of count.items) {
      if (item.discrepancy !== 0) {
        // Adjust inventory to match counted quantity
        const adjustment = await this.inventoryService.adjustStock(
          item.inventoryItemId,
          item.countedQuantity,
          `Inventory count adjustment: ${ count.id }`,
          {countId: count.id, countItemId: item.id},
          userId
        );

        adjustments.push(adjustment);
      }
    }

    // If the count was in progress, mark it as completed
    if (count.status === CountStatus.IN_PROGRESS) {
      await this.completeCount(countId);
    }

    this.eventEmitter.emit('inventory.count.adjustments.applied', {
      countId,
      adjustmentsCount: adjustments.length
    });

    return adjustments;
  }
}
