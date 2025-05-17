import { Module }                       from '@nestjs/common';
import { TypeOrmModule }                from '@nestjs/typeorm';
import { BiogpsService }                from '@modules/gps/services/biogps.service';
import { FeatureToggleModule }          from '@modules/config/base/feature-toggle-module.base';
import { FeatureToggleRegistryService } from '@modules/config/feature-toggle-registry.service';
import { GpsFeatureTogglesProvider }    from '@modules/gps/gps-feature-toggles.provider';
import { RunnerService }                from '@modules/gps/schedulers/runner.service';
import { GpsProviderFactoryService }    from '@modules/gps/services/gps-provider-factory.service';
import { VehicleGpsProviderEntity }     from '@modules/logistics/domain/entities/vehicle-gps-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleGpsProviderEntity
    ])
  ],
  controllers: [],
  providers: [
    BiogpsService,
    RunnerService,
    GpsProviderFactoryService,
    GpsFeatureTogglesProvider
  ],
  exports: [
    BiogpsService,
    GpsProviderFactoryService
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
