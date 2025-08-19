import { forwardRef, Global, Module }   from '@nestjs/common';
import { TypeOrmModule }                from '@nestjs/typeorm';
import { HttpModule }                   from '@nestjs/axios';
import { BiogpsService }                from '@modules/gps/services/biogps.service';
import { OsrmService }                  from '@modules/gps/services/osrm.service';
import { FeatureToggleModule }          from '@modules/config/base/feature-toggle-module.base';
import { FeatureToggleRegistryService } from '@modules/config/feature-toggle-registry.service';
import { GpsFeatureTogglesProvider }    from '@modules/gps/gps-feature-toggles.provider';
import { RunnerService }                from '@modules/gps/schedulers/runner.service';
import { GpsProviderFactoryService }    from '@modules/gps/services/gps-provider-factory.service';
import { VehicleGpsProviderEntity }     from '@modules/logistics/fleet-management/domain/entities/vehicle-gps-provider.entity';
import { GpsController }                from '@modules/gps/controllers/gps.controller';
import { GpsIntegrationsController }    from '@modules/gps/controllers/gps-integrations.controller';
import { GpsService }                   from '@modules/gps/services/gps.service';
import { GpsEntity }                    from '@modules/gps/domain/entities/gps.entity';
import { LogisticsModule }              from '@modules/logistics/logistics.module';
import { TenantModule }                 from '@modules/tenant/tenant.module';
import { BullModule }                   from '@nestjs/bullmq';
import { ConfigModule, ConfigService }  from '@nestjs/config';
import { GpsProcessor }                 from '@modules/gps/processors/gps.processor';

@Global()
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      GpsEntity,
      VehicleGpsProviderEntity
    ]),
    forwardRef(() => LogisticsModule),
    TenantModule,
    BullModule.registerQueueAsync({
      name: 'gps',
      imports: [ ConfigModule ],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('workers.host', {infer: true});
        const port = configService.get('workers.port', {infer: true});
        const username = configService.get<string>('workers.user', {infer: true});
        const password = configService.get<string>('workers.password', {infer: true});
        const isProduction = configService.get('app.nodeEnv', {infer: true}) === 'production';

        return {
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
          connection: {host, port, username, password, family: isProduction ? 0 : undefined}
        };
      },
      inject: [ ConfigService ],
    })
  ],
  controllers: [
    GpsController,
    GpsIntegrationsController,
  ],
  providers: [
    RunnerService,
    BiogpsService,
    GpsService,
    GpsProviderFactoryService,
    OsrmService,
    GpsFeatureTogglesProvider,
    GpsProcessor
  ],
  exports: [
    TypeOrmModule,
    BiogpsService,
    GpsService,
    GpsProviderFactoryService,
    OsrmService,
    BullModule
  ],
})
export class GpsModule extends FeatureToggleModule {
  constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: GpsFeatureTogglesProvider,
  ) {
    super(featureToggleRegistry, featureTogglesProvider, 'gps-updates');
  }
}
