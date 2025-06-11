import { Injectable }                                                     from '@nestjs/common';
import { InjectRepository }                                               from '@nestjs/typeorm';
import { FindManyOptions, Repository }                                    from 'typeorm';
import { EventEmitter2 }                                                  from '@nestjs/event-emitter';
import { InventoryAlertEntity, InventoryAlertStatus, InventoryAlertType } from '../domain/entities/inventory-alert.entity';
import { InventoryItemEntity }                                            from '../domain/entities/inventory-item.entity';

@Injectable()
export class InventoryAlertService {
  constructor(
    @InjectRepository(InventoryAlertEntity)
    private inventoryAlertRepository: Repository<InventoryAlertEntity>,
    @InjectRepository(InventoryItemEntity)
    private inventoryItemRepository: Repository<InventoryItemEntity>,
    private eventEmitter: EventEmitter2
  ) {}

  // Métodos para gestionar alertas
  async findAll(options?: FindManyOptions<InventoryAlertEntity>): Promise<InventoryAlertEntity[]> {
    return this.inventoryAlertRepository.find(options);
  }

  async findOne(id: string): Promise<InventoryAlertEntity> {
    return this.inventoryAlertRepository.findOne({
      where: {id},
      relations: [ 'inventoryItem' ]
    });
  }

  async create(data: any): Promise<InventoryAlertEntity> {
    const alert = this.inventoryAlertRepository.create(data as Partial<InventoryAlertEntity>);
    return this.inventoryAlertRepository.save(alert);
  }

  async update(id: string, data: any): Promise<InventoryAlertEntity> {
    await this.inventoryAlertRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.inventoryAlertRepository.delete(id);
  }

  // Métodos para gestionar estados de alertas
  async acknowledgeAlert(id: string): Promise<InventoryAlertEntity> {
    await this.inventoryAlertRepository.update(id, {
      status: InventoryAlertStatus.ACKNOWLEDGED
    });

    const alert = await this.findOne(id);
    this.eventEmitter.emit('inventory.alert.acknowledged', alert);

    return alert;
  }

  async resolveAlert(id: string): Promise<InventoryAlertEntity> {
    await this.inventoryAlertRepository.update(id, {
      status: InventoryAlertStatus.RESOLVED
    });

    const alert = await this.findOne(id);
    this.eventEmitter.emit('inventory.alert.resolved', alert);

    return alert;
  }

  async dismissAlert(id: string): Promise<InventoryAlertEntity> {
    await this.inventoryAlertRepository.update(id, {
      status: InventoryAlertStatus.DISMISSED
    });

    const alert = await this.findOne(id);
    this.eventEmitter.emit('inventory.alert.dismissed', alert);

    return alert;
  }

  // Métodos para generar alertas
  async checkLowStockAlerts(): Promise<InventoryAlertEntity[]> {
    // Find items with quantity below minimum stock
    const lowStockItems = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.quantity <= item.minimumStock')
      .andWhere('item.minimumStock IS NOT NULL')
      .getMany();

    const alerts: InventoryAlertEntity[] = [];

    for (const item of lowStockItems) {
      // Check if there's already an active alert for this item
      const existingAlert = await this.inventoryAlertRepository.findOne({
        where: {
          inventoryItemId: item.id,
          type: InventoryAlertType.LOW_STOCK,
          status: InventoryAlertStatus.ACTIVE
        }
      });

      if (!existingAlert) {
        // Create new alert
        const alert = await this.create({
          inventoryItemId: item.id,
          type: InventoryAlertType.LOW_STOCK,
          status: InventoryAlertStatus.ACTIVE,
          alertKey: `low_stock_${ item.id }`,
          alertParams: {
            currentQuantity: item.quantity,
            minimumStock: item.minimumStock
          },
          priority: 4 // High priority
        });

        alerts.push(alert);
        this.eventEmitter.emit('inventory.alert.created', alert);
      }
    }

    return alerts;
  }

  async checkOverstockAlerts(): Promise<InventoryAlertEntity[]> {
    // Find items with quantity above maximum stock
    const overstockItems = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.quantity >= item.maximumStock')
      .andWhere('item.maximumStock IS NOT NULL')
      .getMany();

    const alerts: InventoryAlertEntity[] = [];

    for (const item of overstockItems) {
      // Check if there's already an active alert for this item
      const existingAlert = await this.inventoryAlertRepository.findOne({
        where: {
          inventoryItemId: item.id,
          type: InventoryAlertType.OVERSTOCK,
          status: InventoryAlertStatus.ACTIVE
        }
      });

      if (!existingAlert) {
        // Create new alert
        const alert = await this.create({
          inventoryItemId: item.id,
          type: InventoryAlertType.OVERSTOCK,
          status: InventoryAlertStatus.ACTIVE,
          alertKey: `overstock_${ item.id }`,
          alertParams: {
            currentQuantity: item.quantity,
            maximumStock: item.maximumStock
          },
          priority: 2 // Medium-low priority
        });

        alerts.push(alert);
        this.eventEmitter.emit('inventory.alert.created', alert);
      }
    }

    return alerts;
  }

  async checkExpirationAlerts(daysThreshold: number): Promise<InventoryAlertEntity[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    // Find items that will expire within the threshold
    const expiringItems = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.expirationDate IS NOT NULL')
      .andWhere('item.expirationDate <= :thresholdDate', {thresholdDate})
      .andWhere('item.quantity > 0')
      .getMany();

    const alerts: InventoryAlertEntity[] = [];

    for (const item of expiringItems) {
      // Check if there's already an active alert for this item
      const existingAlert = await this.inventoryAlertRepository.findOne({
        where: {
          inventoryItemId: item.id,
          type: InventoryAlertType.EXPIRATION,
          status: InventoryAlertStatus.ACTIVE
        }
      });

      if (!existingAlert) {
        // Calculate days until expiration
        const today = new Date();
        const expirationDate = new Date(item.expirationDate);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Set priority based on days until expiration
        let priority = 3; // Default medium priority
        if (daysUntilExpiration <= 7) {
          priority = 5; // Highest priority for items expiring within a week
        } else if (daysUntilExpiration <= 14) {
          priority = 4; // High priority for items expiring within two weeks
        }

        // Create new alert
        const alert = await this.create({
          inventoryItemId: item.id,
          type: InventoryAlertType.EXPIRATION,
          status: InventoryAlertStatus.ACTIVE,
          alertKey: `expiration_${ item.id }`,
          alertParams: {
            expirationDate: item.expirationDate,
            daysUntilExpiration,
            quantity: item.quantity
          },
          priority
        });

        alerts.push(alert);
        this.eventEmitter.emit('inventory.alert.created', alert);
      }
    }

    return alerts;
  }

  async checkReorderPointAlerts(): Promise<InventoryAlertEntity[]> {
    // Find items with quantity at or below reorder point
    const reorderItems = await this.inventoryItemRepository
      .createQueryBuilder('item')
      .where('item.quantity <= item.reorderPoint')
      .andWhere('item.reorderPoint IS NOT NULL')
      .getMany();

    const alerts: InventoryAlertEntity[] = [];

    for (const item of reorderItems) {
      // Check if there's already an active alert for this item
      const existingAlert = await this.inventoryAlertRepository.findOne({
        where: {
          inventoryItemId: item.id,
          type: InventoryAlertType.REORDER,
          status: InventoryAlertStatus.ACTIVE
        }
      });

      if (!existingAlert) {
        // Create new alert
        const alert = await this.create({
          inventoryItemId: item.id,
          type: InventoryAlertType.REORDER,
          status: InventoryAlertStatus.ACTIVE,
          alertKey: `reorder_${ item.id }`,
          alertParams: {
            currentQuantity: item.quantity,
            reorderPoint: item.reorderPoint
          },
          priority: 3 // Medium priority
        });

        alerts.push(alert);
        this.eventEmitter.emit('inventory.alert.created', alert);
      }
    }

    return alerts;
  }

  // Métodos para notificaciones
  async sendAlertNotifications(): Promise<void> {
    // Find all active alerts that haven't been notified yet
    const pendingAlerts = await this.inventoryAlertRepository.find({
      where: {
        status: InventoryAlertStatus.ACTIVE,
        notificationSent: false
      },
      relations: [ 'inventoryItem', 'inventoryItem.product', 'inventoryItem.warehouse' ]
    });

    for (const alert of pendingAlerts) {
      // In a real implementation, you would send notifications via email, SMS, etc.
      // For now, we'll just emit an event
      this.eventEmitter.emit('inventory.alert.notification', {
        alertId: alert.id,
        alertType: alert.type,
        inventoryItemId: alert.inventoryItemId,
        warehouseId: alert.inventoryItem?.warehouseId,
        priority: alert.priority,
        alertParams: alert.alertParams
      });

      // Mark the alert as notified
      await this.inventoryAlertRepository.update(alert.id, {
        notificationSent: true
      });
    }
  }
}
