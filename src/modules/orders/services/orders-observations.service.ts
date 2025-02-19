import { Injectable }                from '@nestjs/common';
import { InjectRepository }          from '@nestjs/typeorm';
import { OrdersObservationsEntity }  from '@modules/orders/domain/entities/orders-observations.entity';
import { Repository }                from 'typeorm';
import { OrderEntity }               from '@modules/orders/domain/entities/order.entity';
import { OnEvent }                   from '@nestjs/event-emitter';
import { ORDER_OBSERVATION_CREATED } from '@modules/orders/domain/events.constant';

@Injectable()
export class OrdersObservationsService {
  constructor(
    @InjectRepository(OrdersObservationsEntity) private ordersObservationsRepository: Repository<OrdersObservationsEntity>
  ) {}

  findByOrderId(orderId: string): Promise<OrdersObservationsEntity[]> {
    return this.ordersObservationsRepository.find({where: {order: {id: orderId}}});
  }

  @OnEvent(ORDER_OBSERVATION_CREATED, {async: true})
  create({orderId, observation, ...others}: {
    orderId: string,
    observation: string,
    [key: string]: any
  }): Promise<OrdersObservationsEntity> {
    const observationEntity = this.ordersObservationsRepository.create({
      order: new OrderEntity({id: orderId}),
      observation,
      metadata: {...others}
    });

    return this.ordersObservationsRepository.save(observationEntity);
  }
}
