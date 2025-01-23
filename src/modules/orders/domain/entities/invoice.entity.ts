import { Column, Entity, OneToOne, Unique } from 'typeorm';
import { InvoiceStatusEnum }                from '@modules/orders/domain/enums/invoice-status.enum';
import { AbstractEntity }                   from '@shared/domain/entities/abstract.entity';
import { OrderEntity }                      from '@modules/orders/domain/entities/order.entity';

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

  @OneToOne(() => OrderEntity, order => order.invoice)
  order: OrderEntity;

  @Column()
  netAmount: number;

  @Column()
  taxAmount: number;

  @Column()
  totalAmount: number;
}
