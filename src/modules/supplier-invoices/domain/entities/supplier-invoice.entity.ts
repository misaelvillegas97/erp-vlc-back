import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SupplierPaymentEntity }                                        from './supplier-payment.entity';
import { SupplierEntity }                                               from '@modules/supplier/domain/entities/supplier.entity';

@Entity('supplier_invoices')
export class SupplierInvoiceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: false})
  invoiceNumber: string;

  @Column({type: 'date', nullable: false})
  issueDate: Date;

  @Column({type: 'date', nullable: false})
  dueDate: Date;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: false})
  amount: number;

  @Column({nullable: true})
  description?: string;

  @OneToMany(() => SupplierPaymentEntity, payment => payment.invoice)
  payments: SupplierPaymentEntity[];

  @ManyToOne(() => SupplierEntity, supplier => supplier.invoices)
  supplier: SupplierEntity;
}
