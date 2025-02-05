import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { InvoiceStatusEnum }                                       from '@modules/orders/domain/enums/invoice-status.enum';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { OrderEntity }                                             from '@modules/orders/domain/entities/order.entity';
import { ClientEntity }                                            from '@modules/clients/domain/entities/client.entity';
import { UserEntity }                                              from '@modules/users/domain/entities/user.entity';

@Entity({name: 'orders_invoice'})
@Unique([ 'invoiceNumber' ])
export class InvoiceEntity extends AbstractEntity {
  @Column()
  invoiceNumber: number;

  @Column({type: 'enum', enum: InvoiceStatusEnum})
  status: InvoiceStatusEnum;

  @Column({nullable: true})
  observations?: string;

  @Column({type: 'date'})
  emissionDate: string;

  @Column({type: 'date', nullable: true})
  dueDate?: string;

  @Column({type: 'date', nullable: true})
  paymentDate?: string;

  @Column()
  netAmount: number;

  @Column()
  taxAmount: number;

  @Column()
  totalAmount: number;

  @OneToOne(() => OrderEntity, order => order.invoice)
  order: OrderEntity;

  @ManyToOne(() => ClientEntity, client => client.id)
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  // Delivery assignment
  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({name: 'delivery_assignment_id'})
  deliveryAssignment?: UserEntity;
}
