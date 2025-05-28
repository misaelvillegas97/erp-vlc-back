import { Injectable, Logger }    from '@nestjs/common';
import { Cron }                  from '@nestjs/schedule';
import { InventoryAlertService } from '../services/inventory-alert.service';

@Injectable()
export class InventoryAlertScheduler {
  constructor(
    private readonly inventoryAlertService: InventoryAlertService,
    private readonly logger: Logger
  ) {}

  @Cron('0 0 * * *') // Ejecutar diariamente a medianoche
  async checkLowStockAlerts() {
    this.logger.log('Checking for low stock alerts');
    try {
      const alerts = await this.inventoryAlertService.checkLowStockAlerts();
      this.logger.log(`Generated ${ alerts.length } low stock alerts`);
    } catch (error) {
      this.logger.error('Error checking low stock alerts', error.stack);
    }
  }

  @Cron('0 1 * * *') // Ejecutar diariamente a la 1 AM
  async checkOverstockAlerts() {
    this.logger.log('Checking for overstock alerts');
    try {
      const alerts = await this.inventoryAlertService.checkOverstockAlerts();
      this.logger.log(`Generated ${ alerts.length } overstock alerts`);
    } catch (error) {
      this.logger.error('Error checking overstock alerts', error.stack);
    }
  }

  @Cron('0 2 * * *') // Ejecutar diariamente a las 2 AM
  async checkExpirationAlerts() {
    this.logger.log('Checking for expiration alerts');
    try {
      const alerts = await this.inventoryAlertService.checkExpirationAlerts(30); // 30 días de umbral
      this.logger.log(`Generated ${ alerts.length } expiration alerts`);
    } catch (error) {
      this.logger.error('Error checking expiration alerts', error.stack);
    }
  }

  @Cron('0 3 * * *') // Ejecutar diariamente a las 3 AM
  async checkReorderPointAlerts() {
    this.logger.log('Checking for reorder point alerts');
    try {
      const alerts = await this.inventoryAlertService.checkReorderPointAlerts();
      this.logger.log(`Generated ${ alerts.length } reorder point alerts`);
    } catch (error) {
      this.logger.error('Error checking reorder point alerts', error.stack);
    }
  }

  @Cron('0 8 * * *') // Ejecutar diariamente a las 8 AM
  async sendAlertNotifications() {
    this.logger.log('Sending alert notifications');
    try {
      await this.inventoryAlertService.sendAlertNotifications();
      this.logger.log('Alert notifications sent successfully');
    } catch (error) {
      this.logger.error('Error sending alert notifications', error.stack);
    }
  }
}
