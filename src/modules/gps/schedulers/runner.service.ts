import { Injectable, Logger }   from '@nestjs/common';
import { BiogpsService }        from '@modules/gps/services/biogps.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfigService }     from '@modules/config/app-config.service';

@Injectable()
export class RunnerService {
  private readonly logger = new Logger('GPS' + RunnerService.name);

  constructor(
    private readonly biogpsService: BiogpsService,
    private readonly configService: AppConfigService,
  ) {
    this.logger.log('GPS RunnerService initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkBiogpsGPS() {
    const config = await this.configService.findFeatureToggleByName('biogps-provider');

    if (!config?.enabled) return;

    const gpsData = await this.biogpsService.getAllCurrent(config.metadata.endpoint, config.metadata.apiKey);

    if (gpsData.length > 0) this.biogpsService.emitGpsEvents(gpsData);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async bioGPSDiscovery() {
    const config = await this.configService.findFeatureToggleByName('biogps-provider');

    if (!config?.enabled) return;

    await this.biogpsService.discover(config.metadata.endpoint, config.metadata.apiKey);
  }
}
