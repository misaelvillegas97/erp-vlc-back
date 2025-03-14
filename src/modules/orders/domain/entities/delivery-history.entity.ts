import { OrderEntity }                                                   from '@modules/orders/domain/entities/order.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('delivery_history')
export class DeliveryHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'uuid', name: 'order_id'})
  orderId: string;

  @Column()
  status: string;

  @Column({type: 'timestamp'})
  timestamp: Date;

  @ManyToOne(() => OrderEntity, (order) => order.deliveryHistory)
  @JoinColumn({name: 'order_id'})
  order: OrderEntity;
}
