import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { ProductRequestEntity }                                     from './product-request.entity';
import { ClientEntity }                                             from '@modules/clients/domain/entities/client.entity';
import { OrderTypeEnum }                                            from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }                                          from '@modules/orders/domain/enums/order-status.enum';
import { InvoiceEntity }                                            from '@modules/invoices/domain/entities/invoice.entity';
import { OrdersObservationsEntity }                                 from '@modules/orders/domain/entities/orders-observations.entity';
import { DateTime }                                                 from 'luxon';
import { AbstractEntity }                                           from '@shared/domain/entities/abstract.entity';

@Entity({name: 'orders'})
@Unique([ 'referenceId', 'client' ])
export class OrderEntity extends AbstractEntity {
  @Column({unique: true, name: 'order_number'})
  orderNumber: string;

  @Column({nullable: true, name: 'reference_id'})
  referenceId: string;

  @Column()
  type: OrderTypeEnum;

  @Column()
  status: OrderStatusEnum;

  @Column({name: 'delivery_location'})
  deliveryLocation: string;

  @Column({type: 'date', name: 'delivery_date'})
  deliveryDate: string;

  @Column({type: 'date', name: 'emission_date'})
  emissionDate: string = DateTime.now().toISODate();

  @Column({type: 'date', nullable: true, name: 'delivered_date'})
  deliveredDate?: string;

  @Column({nullable: true, type: 'json', name: 'additional_info'})
  additionalInfo?: Record<string, any>;

  @OneToMany(() => OrdersObservationsEntity, (observation) => observation.order, {cascade: true})
  observations?: OrdersObservationsEntity[];

  @OneToMany(() => ProductRequestEntity, (product) => product.order, {cascade: true})
  products: ProductRequestEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.order, {cascade: true})
  invoices: InvoiceEntity[];

  @ManyToOne(() => ClientEntity, (client) => client.id, {eager: true})
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  constructor(values: Partial<OrderEntity>) {
    super();
    Object.assign(this, values);
  }
}
