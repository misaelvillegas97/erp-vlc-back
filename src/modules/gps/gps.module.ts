import { Module }                       from '@nestjs/common';
import { BiogpsService }                from '@modules/gps/services/biogps.service';
import { FeatureToggleModule }          from '@modules/config/base/feature-toggle-module.base';
import { FeatureToggleRegistryService } from '@modules/config/feature-toggle-registry.service';
import { GpsFeatureTogglesProvider }    from '@modules/gps/gps-feature-toggles.provider';

@Module({
  imports: [],
  controllers: [],
  providers: [
    BiogpsService,
  ],
  exports: [],
})
export class GpsModule extends FeatureToggleModule {
  constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: GpsFeatureTogglesProvider,
  ) {
    super(featureToggleRegistry, featureTogglesProvider, 'gps-updates');
  }
}
