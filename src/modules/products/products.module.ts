import { Module }                          from '@nestjs/common';
import { ProductsController }              from './products.controller';
import { ProductsService }                 from './products.service';
import { ProductEntity }                   from './domain/entities/product.entity';
import { TypeOrmModule }                   from '@nestjs/typeorm';
import { ProductProviderCodeClientEntity } from '@modules/products/domain/entities/product-provider-code-client.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ProductEntity, ProductProviderCodeClientEntity ]) ],
  controllers: [ ProductsController ],
  providers: [ ProductsService ],
  exports: [ ProductsService ]
})
export class ProductsModule {}
