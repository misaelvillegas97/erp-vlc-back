import { forwardRef, Module }   from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { OrderService }         from '@modules/orders/order.service';
import { OrderController }      from '@modules/orders/order.controller';
import { OrderEntity }          from '@modules/orders/domain/entities/order.entity';
import { ProductRequestEntity } from '@modules/orders/domain/entities/product-request.entity';
import { InvoicesModule }       from '@modules/invoices/invoices.module';
import { UsersModule }          from '@modules/users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([ OrderEntity, ProductRequestEntity ]),
    forwardRef(() => InvoicesModule)
  ],
  controllers: [ OrderController ],
  providers: [ OrderService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
