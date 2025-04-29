import { Injectable }                  from '@nestjs/common';
import { CreateFeatureToggleDto }      from '@modules/config/dto/create-feature-toggle.dto';
import { ModuleFeatureToggleProvider } from '@modules/config/interfaces/module-feature-toggle-provider.interface';

@Injectable()
export class ProductsFeatureTogglesProvider implements ModuleFeatureToggleProvider {
  getModuleFeatureToggles(): CreateFeatureToggleDto[] {
    return [
      {
        name: 'products',
        displayName: 'Products Module',
        description: 'Enable/disable products module features',
        enabled: true,
        category: 'products',
      },
      {
        name: 'product-import',
        displayName: 'Product Import',
        description: 'Enable/disable product import functionality',
        enabled: true,
        category: 'products',
        parentId: null, // Will be updated dynamically
      },
      {
        name: 'product-export',
        displayName: 'Product Export',
        description: 'Enable/disable product export functionality',
        enabled: true,
        category: 'products',
        parentId: null, // Will be updated dynamically
      },
      {
        name: 'product-barcode',
        displayName: 'Product Barcode Generation',
        description: 'Enable/disable product barcode generation',
        enabled: true,
        category: 'products',
        parentId: null, // Will be updated dynamically
      }
    ];
  }
}
