import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn
}                                   from 'typeorm';
import { ProductRequestEntity }     from './product-request.entity';
import { v4 }                       from 'uuid';
import { ClientEntity }             from '@modules/clients/domain/entities/client.entity';
import { OrderTypeEnum }            from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }          from '@modules/orders/domain/enums/order-status.enum';
import { InvoiceEntity }            from '@modules/invoices/domain/entities/invoice.entity';
import { OrdersObservationsEntity } from '@modules/orders/domain/entities/orders-observations.entity';
import { DateTime }                 from 'luxon';

@Entity({name: 'orders'})
@Unique([ 'referenceId', 'client' ])
export class OrderEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column({unique: true})
  orderNumber: string;

  @Column({nullable: true})
  referenceId: string;

  @Column()
  type: OrderTypeEnum;

  @Column()
  status: OrderStatusEnum;

  @Column()
  deliveryLocation: string;

  @Column({type: 'date'})
  deliveryDate: string;

  @Column({type: 'date'})
  emissionDate: string = DateTime.now().toISODate();

  @Column({type: 'date', nullable: true})
  deliveredDate?: string;

  @Column({nullable: true, type: 'json'})
  additionalInfo?: Record<string, any>;

  @OneToMany(() => OrdersObservationsEntity, (observation) => observation.order, {cascade: true})
  observations?: OrdersObservationsEntity[];

  @OneToMany(() => ProductRequestEntity, (product) => product.orderRequest, {cascade: true})
  products: ProductRequestEntity[];

  @OneToOne(() => InvoiceEntity, (invoice) => invoice.order, {cascade: true})
  @JoinColumn({name: 'invoice_id'})
  invoice: InvoiceEntity;

  @ManyToOne(() => ClientEntity, (client) => client.id, {eager: true})
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  @CreateDateColumn({name: 'created_at'})
  createdAt: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt: Date;

  constructor(values: Partial<OrderEntity>) {
    Object.assign(this, values);
  }
}
