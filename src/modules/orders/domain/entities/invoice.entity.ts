import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';
import { InvoiceStatusEnum }                                       from '@modules/orders/domain/enums/invoice-status.enum';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { OrderEntity }                                             from '@modules/orders/domain/entities/order.entity';
import { ClientEntity }                                            from '@modules/clients/domain/entities/client.entity';

@Entity({name: 'orders_invoice'})
@Unique([ 'invoiceNumber' ])
export class InvoiceEntity extends AbstractEntity {
  @Column()
  invoiceNumber: number;

  @Column({type: 'enum', enum: InvoiceStatusEnum})
  status: InvoiceStatusEnum;

  @Column({nullable: true})
  observations?: string;

  @Column()
  emissionDate: string;

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
}
