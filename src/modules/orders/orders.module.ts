import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { OrderService }              from '@modules/orders/order.service';
import { OrderController }           from '@modules/orders/order.controller';
import { OrderEntity }               from '@modules/orders/domain/entities/order.entity';
import { OrderProductEntity }        from '@modules/orders/domain/entities/order-product.entity';
import { UsersModule }               from '@modules/users/users.module';
import { ProductsModule }            from '@modules/products/products.module';
import { OrdersObservationsEntity }  from '@modules/orders/domain/entities/orders-observations.entity';
import { InvoicesModule }            from '@modules/invoices/invoices.module';
import { OrdersObservationsService } from '@modules/orders/services/orders-observations.service';
import { ReportsController }         from '@modules/orders/controllers/reports.controller';
import { ReportsService }            from '@modules/orders/services/reports.service';
import { DeliveryHistoryController } from '@modules/orders/controllers/delivery-history.controller';
import { DeliveryHistoryService }    from '@modules/orders/services/delivery-history.service';
import { DeliveryHistoryEntity }     from '@modules/orders/domain/entities/delivery-history.entity';

@Module({
  imports: [
    ProductsModule,
    UsersModule,
    TypeOrmModule.forFeature([ OrderEntity, OrderProductEntity, OrdersObservationsEntity, DeliveryHistoryEntity ]),
    InvoicesModule
  ],
  controllers: [ DeliveryHistoryController, ReportsController, OrderController ],
  providers: [ OrderService, OrdersObservationsService, ReportsService, DeliveryHistoryService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
