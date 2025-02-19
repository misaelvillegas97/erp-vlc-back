import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { OrderService }              from '@modules/orders/order.service';
import { OrderController }           from '@modules/orders/order.controller';
import { OrderEntity }               from '@modules/orders/domain/entities/order.entity';
import { ProductRequestEntity }      from '@modules/orders/domain/entities/product-request.entity';
import { UsersModule }               from '@modules/users/users.module';
import { ProductsModule }            from '@modules/products/products.module';
import { OrdersObservationsEntity }  from '@modules/orders/domain/entities/orders-observations.entity';
import { InvoicesModule }            from '@modules/invoices/invoices.module';
import { OrdersObservationsService } from '@modules/orders/services/orders-observations.service';

@Module({
  imports: [
    ProductsModule,
    UsersModule,
    TypeOrmModule.forFeature([ OrderEntity, ProductRequestEntity, OrdersObservationsEntity ]),
    InvoicesModule
  ],
  controllers: [ OrderController ],
  providers: [ OrderService, OrdersObservationsService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
