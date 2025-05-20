import { Injectable, Logger }      from '@nestjs/common';
import { Cron, CronExpression }    from '@nestjs/schedule';
import { MaintenanceService }      from '../services/maintenance.service';
import { VehicleDocumentsService } from '../services/vehicle-documents.service';

@Injectable()
export class MaintenanceScheduler {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly vehicleDocumentsService: VehicleDocumentsService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkMaintenanceAlerts() {
    this.logger.debug('Running maintenance alerts check');
    await this.maintenanceService.generateMaintenanceAlerts();
    this.logger.debug('Maintenance alerts check completed');
  }

  @Cron(CronExpression.EVERY_WEEK)
  async checkDocumentExpirations() {
    this.logger.debug('Running document expirations check');
    const expiringDocuments = await this.vehicleDocumentsService.checkDocumentExpirations();
    this.logger.debug(`Found ${ expiringDocuments.length } expiring documents`);

    // Log details of expiring documents
    if (expiringDocuments.length > 0) {
      for (const doc of expiringDocuments) {
        this.logger.log(`Vehicle ${ doc.licensePlate }: ${ doc.documentName } expires in ${ doc.daysRemaining } days (${ doc.expiryDate })`);
      }
    }
  }
}
