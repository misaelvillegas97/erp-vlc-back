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
import { GpsService }                   from '@modules/gps/services/gps.service';
import { GpsEntity }                    from '@modules/gps/domain/entities/gps.entity';
import { LogisticsModule }              from '@modules/logistics/logistics.module';

@Global()
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      GpsEntity,
      VehicleGpsProviderEntity
    ]),
    forwardRef(() => LogisticsModule)
  ],
  controllers: [ GpsController ],
  providers: [
    RunnerService,
    BiogpsService,
    GpsService,
    GpsProviderFactoryService,
    OsrmService,
    GpsFeatureTogglesProvider
  ],
  exports: [
    TypeOrmModule,
    BiogpsService,
    GpsService,
    GpsProviderFactoryService,
    OsrmService
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
