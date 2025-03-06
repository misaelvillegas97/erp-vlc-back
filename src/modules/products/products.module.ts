import { Module }                     from '@nestjs/common';
import { ProductsController }         from './products.controller';
import { ProductsService }            from './products.service';
import { ProductEntity }              from './domain/entities/product.entity';
import { TypeOrmModule }              from '@nestjs/typeorm';
import { ProductsProviderCodeEntity } from '@modules/products/domain/entities/products-provider-code.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ProductEntity, ProductsProviderCodeEntity ]) ],
  controllers: [ ProductsController ],
  providers: [ ProductsService ],
  exports: [ ProductsService ]
})
export class ProductsModule {}
