import { Injectable, Logger }    from '@nestjs/common';
import { Cron }                  from '@nestjs/schedule';
import { InventoryCountService } from '../services/inventory-count.service';
import { WarehouseService }      from '../services/warehouse.service';
import { CountStatus }           from '../domain/entities/inventory-count.entity';

@Injectable()
export class InventoryCountScheduler {
  constructor(
    private readonly inventoryCountService: InventoryCountService,
    private readonly warehouseService: WarehouseService,
    private readonly logger: Logger
  ) {}

  @Cron('0 4 * * 0') // Ejecutar semanalmente los domingos a las 4 AM
  async scheduleWeeklyInventoryCounts() {
    this.logger.log('Scheduling weekly inventory counts');
    try {
      // Get all active warehouses
      const warehouses = await this.warehouseService.findAll({limit: 1000});
      const activeWarehouses = warehouses.items.filter(warehouse => warehouse.isActive);

      for (const warehouse of activeWarehouses) {
        // Create a weekly count for each warehouse
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 7); // Schedule for next week

        await this.inventoryCountService.create({
          name: `Weekly Count - ${ warehouse.name } - ${ scheduledDate.toISOString().split('T')[0] }`,
          description: 'Automatically scheduled weekly inventory count',
          warehouseId: warehouse.id,
          scheduledDate,
          status: CountStatus.PLANNED
        });
      }

      this.logger.log(`Scheduled ${ activeWarehouses.length } weekly inventory counts`);
    } catch (error) {
      this.logger.error('Error scheduling weekly inventory counts', error.stack);
    }
  }

  @Cron('0 5 1 * *') // Ejecutar mensualmente el día 1 a las 5 AM
  async scheduleMonthlyInventoryCounts() {
    this.logger.log('Scheduling monthly inventory counts');
    try {
      // Get all active warehouses
      const warehouses = await this.warehouseService.findAll();
      const activeWarehouses = warehouses.items.filter(warehouse => warehouse.isActive);

      for (const warehouse of activeWarehouses) {
        // Create a monthly count for each warehouse
        const today = new Date();
        const scheduledDate = new Date(today.getFullYear(), today.getMonth() + 1, 15); // Schedule for the 15th of next month

        await this.inventoryCountService.create({
          name: `Monthly Count - ${ warehouse.name } - ${ scheduledDate.toISOString().split('T')[0] }`,
          description: 'Automatically scheduled monthly inventory count',
          warehouseId: warehouse.id,
          scheduledDate,
          status: CountStatus.PLANNED
        });
      }

      this.logger.log(`Scheduled ${ activeWarehouses.length } monthly inventory counts`);
    } catch (error) {
      this.logger.error('Error scheduling monthly inventory counts', error.stack);
    }
  }
}
