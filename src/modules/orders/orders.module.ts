import { Module }               from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { OrderService }         from '@modules/orders/order.service';
import { OrderController }      from '@modules/orders/order.controller';
import { OrderEntity }          from '@modules/orders/domain/entities/order.entity';
import { ProductRequestEntity } from '@modules/orders/domain/entities/product-request.entity';
import { InvoicesModule }       from '@modules/invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ OrderEntity, ProductRequestEntity ]),
    InvoicesModule
  ],
  controllers: [ OrderController ],
  providers: [ OrderService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
