import { Module }               from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { OrderService }         from '@modules/orders/order.service';
import { OrderController }      from '@modules/orders/order.controller';
import { OrderEntity }          from '@modules/orders/domain/entities/order.entity';
import { ProductRequestEntity } from '@modules/orders/domain/entities/product-request.entity';
import { InvoiceEntity }        from '@modules/orders/domain/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ OrderEntity, ProductRequestEntity, InvoiceEntity ]),
  ],
  controllers: [ OrderController ],
  providers: [ OrderService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
