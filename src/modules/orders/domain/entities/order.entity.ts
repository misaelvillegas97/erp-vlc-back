import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { OrderProductEntity }                                              from './order-product.entity';
import { ClientEntity }                                                    from '@modules/clients/domain/entities/client.entity';
import { OrderTypeEnum }                                                   from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }                                                 from '@modules/orders/domain/enums/order-status.enum';
import { InvoiceEntity }                                                   from '@modules/invoices/domain/entities/invoice.entity';
import { OrdersObservationsEntity }                                        from '@modules/orders/domain/entities/orders-observations.entity';
import { DateTime }                                                        from 'luxon';
import { AbstractEntity }                                                  from '@shared/domain/entities/abstract.entity';
import { DeliveryHistoryEntity }                                           from '@modules/orders/domain/entities/delivery-history.entity';

@Entity({name: 'orders'})
@Unique([ 'referenceId', 'client' ])
export class OrderEntity extends AbstractEntity {
  @Column({unique: true, name: 'order_number'})
  @Index()
  orderNumber: string;

  @Column({nullable: true, name: 'reference_id'})
  referenceId: string;

  @Column()
  type: OrderTypeEnum;

  @Column({type: 'enum', enum: OrderStatusEnum, default: OrderStatusEnum.CREATED})
  status: OrderStatusEnum;

  @Column({name: 'delivery_location'})
  deliveryLocation: string;

  @Column({type: 'date', name: 'delivery_date'})
  deliveryDate: string;

  @Column({type: 'date', name: 'emission_date'})
  emissionDate: string = DateTime.now().toISODate();

  @Column({nullable: true, name: 'delivered_date', type: 'timestamp without time zone'})
  deliveredDate?: Date;

  @Column({nullable: true, type: 'json', name: 'additional_info'})
  additionalInfo?: Record<string, any>;

  @OneToMany(() => OrdersObservationsEntity, (observation) => observation.order, {cascade: true})
  observations?: OrdersObservationsEntity[];

  @OneToMany(() => OrderProductEntity, (product) => product.order, {cascade: true})
  products: OrderProductEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.order, {cascade: true})
  invoices: InvoiceEntity[];

  @OneToMany(() => DeliveryHistoryEntity, (history) => history.order, {cascade: true})
  deliveryHistory: DeliveryHistoryEntity[];

  @ManyToOne(() => ClientEntity, (client) => client.id, {eager: true})
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  constructor(values: Partial<OrderEntity>) {
    super();
    Object.assign(this, values);
  }
}
