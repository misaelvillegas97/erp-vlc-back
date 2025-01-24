import { Module }              from '@nestjs/common';
import { ProductsController }  from './products.controller';
import { ProductsService }     from './products.service';
import { ProductEntity }       from './domain/entities/product.entity';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { ClientProductEntity } from '@modules/products/domain/entities/client-product.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ProductEntity, ClientProductEntity ]) ],
  controllers: [ ProductsController ],
  providers: [ ProductsService ],
  exports: [ ProductsService ]
})
export class ProductsModule {}
