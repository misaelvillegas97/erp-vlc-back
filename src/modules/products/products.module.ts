import { Module }                         from '@nestjs/common';
import { ProductsController }             from './products.controller';
import { ProductsService }                from './products.service';
import { ProductEntity }                  from './domain/entities/product.entity';
import { TypeOrmModule }                  from '@nestjs/typeorm';
import { ProductsProviderCodeEntity }     from '@modules/products/domain/entities/products-provider-code.entity';
import { ProductsFeatureTogglesProvider } from './products-feature-toggles.provider';
import { FeatureToggleRegistryService }   from '@modules/config/feature-toggle-registry.service';
import { FeatureToggleModule }            from '@modules/config/base/feature-toggle-module.base';

@Module({
  imports: [ TypeOrmModule.forFeature([ ProductEntity, ProductsProviderCodeEntity ]) ],
  controllers: [ ProductsController ],
  providers: [
    ProductsService,
    ProductsFeatureTogglesProvider
  ],
  exports: [ ProductsService ]
})
export class ProductsModule extends FeatureToggleModule {
  constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: ProductsFeatureTogglesProvider,
  ) {
    super(featureToggleRegistry, featureTogglesProvider, 'products');
  }
}
