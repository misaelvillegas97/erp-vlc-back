import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SupplierInvoiceEntity }                             from './supplier-invoice.entity';

@Entity('supplier_payments')
export class SupplierPaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'date', nullable: false})
  paymentDate: Date;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: false})
  amount: number;

  @Column({nullable: true})
  method?: string;

  @Column({nullable: true})
  reference?: string;

  @ManyToOne(() => SupplierInvoiceEntity, invoice => invoice.payments)
  invoice: SupplierInvoiceEntity;
}
