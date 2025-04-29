import { Injectable }                  from '@nestjs/common';
import { ModuleFeatureToggleProvider } from '@modules/config/interfaces/module-feature-toggle-provider.interface';
import { CreateFeatureToggleDto }      from '@modules/config/dto/create-feature-toggle.dto';
import { RequiredMetadataModel }       from '@modules/config/domain/required-metadata.model';

@Injectable()
export class GpsFeatureTogglesProvider implements ModuleFeatureToggleProvider {
  getModuleFeatureToggles(): CreateFeatureToggleDto[] {
    return [
      {
        name: 'gps-updates',
        displayName: 'GPS Vehicle Tracking',
        description: 'Enable/disable GPS location updates for vehicles',
        enabled: true,
        category: 'logistics',
      },
      {
        name: 'biogps-provider',
        displayName: 'BioGPS Provider',
        description: 'Enable/disable BioGPS location provider',
        enabled: true,
        category: 'logistics',
        parentId: null,
        metadata: {
          apiKey: 'demo-key',
          endpoint: 'https://api.biogps.example.com/v1'
        },
        requiredMetadata: [
          {
            name: 'endpoint',
            description: 'API endpoint for BioGPS',
            type: 'string',
          },
          {
            name: 'apiKey',
            description: 'API key for BioGPS authentication',
            type: 'string',
          }
        ] as RequiredMetadataModel[]
      },
      {
        name: 'biogps-history',
        displayName: 'BioGPS History Tracking',
        description: 'Enable/disable historical route logging from BioGPS',
        enabled: true,
        category: 'logistics',
        parentId: null,
        metadata: {
          retentionDays: 90
        }
      }
    ];
  }
}
