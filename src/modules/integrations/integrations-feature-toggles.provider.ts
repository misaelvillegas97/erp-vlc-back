import { Injectable }                  from '@nestjs/common';
import { CreateFeatureToggleDto }      from '@modules/config/dto/create-feature-toggle.dto';
import { ModuleFeatureToggleProvider } from '@modules/config/interfaces/module-feature-toggle-provider.interface';
import { CENCOSUD_FEATURE_KEY }        from '@modules/integrations/services/cencosud-b2b.service';
import { COMERCIONET_FEATURE_KEY }     from '@modules/integrations/services/comercio-net.service';

@Injectable()
export class IntegrationsFeatureTogglesProvider implements ModuleFeatureToggleProvider {
  getModuleFeatureToggles(): CreateFeatureToggleDto[] {
    return [
      {
        name: 'integrations',
        displayName: 'External Integrations',
        description: 'Enable/disable integration with external systems',
        enabled: true,
        category: 'integrations',
      },
      {
        name: CENCOSUD_FEATURE_KEY,
        displayName: 'Cencosud B2B Scrapping',
        description: 'Enable/disable Cencosud B2B scrapping web platform',
        enabled: true,
        category: 'scrapping',
        parentId: null, // Will be updated dynamically
      },
      {
        name: COMERCIONET_FEATURE_KEY,
        displayName: 'ComercioNet Scrapping',
        description: 'Enable/disable ComercioNet scrapping web platform',
        enabled: true,
        category: 'scrapping',
        parentId: null, // Will be updated dynamically
      }
    ];
  }
}
