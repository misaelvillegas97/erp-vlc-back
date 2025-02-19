import { Column, Entity, ManyToOne } from 'typeorm';
import { OrderEntity }               from '@modules/orders/domain/entities/order.entity';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';

@Entity({name: 'orders_observations'})
export class OrdersObservationsEntity extends AbstractEntity {
  @Column({type: 'text'})
  observation: string;

  @Column({type: 'json', nullable: true})
  metadata: Record<string, any>;

  @ManyToOne(() => OrderEntity, order => order.observations)
  order: OrderEntity;

  constructor(partial?: Partial<OrdersObservationsEntity>) {
    super();
    Object.assign(this, partial);
  }
}
