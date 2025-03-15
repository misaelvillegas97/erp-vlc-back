import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity }                                     from '@modules/invoices/domain/entities/invoice.entity';
import { PaymentMethodEnum }                                 from '@modules/invoices/domain/enums/payment-method.enum';

@Entity('invoices_payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'date'})
  paymentDate: Date;

  @Column({type: 'decimal', precision: 10, scale: 2})
  amount: number;

  @Column({type: 'enum', enum: PaymentMethodEnum, nullable: true})
  method?: PaymentMethodEnum;

  @Column({nullable: true})
  reference?: string;

  @ManyToOne(() => InvoiceEntity, invoice => invoice.payments)
  invoice: InvoiceEntity;
}
