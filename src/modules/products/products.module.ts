import { Module }             from '@nestjs/common';
import { ProductsController } from '@modules/products/products.controller';
import { ProductsService }    from '@modules/products/products.service';

@Module({
  imports: [],
  controllers: [ ProductsController ],
  providers: [ ProductsService ],
  exports: [ ProductsService ],
})
export class ProductsModule {}
