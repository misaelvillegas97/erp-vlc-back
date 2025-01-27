import { Module }               from '@nestjs/common';
import { ProductsController }   from './products.controller';
import { ProductsService }      from './products.service';
import { ProductEntity }        from './domain/entities/product.entity';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { ProductsClientEntity } from '@modules/products/domain/entities/products-client.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ProductEntity, ProductsClientEntity ]) ],
  controllers: [ ProductsController ],
  providers: [ ProductsService ],
  exports: [ ProductsService ]
})
export class ProductsModule {}
