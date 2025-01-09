import { Module }               from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { OrderService }         from '@modules/orders/services/order.service';
import { OrderController }      from '@modules/orders/controllers/order.controller';
import { OrderEntity }          from '@modules/orders/domain/entities/order.entity';
import { ProductRequestEntity } from '@modules/orders/domain/entities/product-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ OrderEntity, ProductRequestEntity ]),
  ],
  controllers: [ OrderController ],
  providers: [ OrderService ],
  exports: [ OrderService ]
})
export class OrdersModule {}
