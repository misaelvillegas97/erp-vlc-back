import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity }                                     from '@modules/invoices/domain/entities/invoice.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'date'})
  paymentDate: Date;

  @Column({type: 'decimal', precision: 10, scale: 2})
  amount: number;

  @Column({nullable: true})
  method: string;

  @Column({nullable: true})
  reference?: string;

  @ManyToOne(() => InvoiceEntity, invoice => invoice.payments)
  invoice: InvoiceEntity;
}
