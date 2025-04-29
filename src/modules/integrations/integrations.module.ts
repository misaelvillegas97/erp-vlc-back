import { Module }                             from '@nestjs/common';
import { ComercioNetService }                 from '@modules/integrations/services/comercio-net.service';
import { CencosudB2bService }                 from '@modules/integrations/services/cencosud-b2b.service';
import { TasksScheduler }                     from '@modules/integrations/scheduler/tasks.scheduler';
import { OrdersModule }                       from '@modules/orders/orders.module';
import { IntegrationController }              from '@modules/integrations/controllers/integration.controller';
import { ClientsModule }                      from '@modules/clients/clients.module';
import { IntegrationsFeatureTogglesProvider } from './integrations-feature-toggles.provider';
import { FeatureToggleRegistryService }       from '@modules/config/feature-toggle-registry.service';
import { FeatureToggleModule }                from '@modules/config/base/feature-toggle-module.base';

@Module({
  imports: [
    OrdersModule,
    ClientsModule
  ],
  controllers: [ IntegrationController ],
  providers: [
    // Services
    ComercioNetService,
    CencosudB2bService,

    // Schedulers
    TasksScheduler,

    // Feature Toggles Provider
    IntegrationsFeatureTogglesProvider
  ],
  exports: [],
})
export class IntegrationsModule extends FeatureToggleModule {
  constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: IntegrationsFeatureTogglesProvider,
  ) {
    super(featureToggleRegistry, featureTogglesProvider, 'integrations');
  }
}
