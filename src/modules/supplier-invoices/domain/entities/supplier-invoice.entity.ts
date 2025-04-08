import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { SupplierPaymentEntity }                from './supplier-payment.entity';
import { SupplierEntity }                       from '@modules/supplier/domain/entities/supplier.entity';
import { SupplierInvoiceStatusEnum }            from '@modules/supplier-invoices/domain/enums/invoice-status.enum';
import { AbstractEntity }                       from '@shared/domain/entities/abstract.entity';
import { ExpenseTypesEntity }                   from '@modules/types/domain/entities/expense-types.entity';

@Entity('supplier_invoices', {orderBy: {issueDate: 'DESC'}})
export class SupplierInvoiceEntity extends AbstractEntity {
  @Column({nullable: false})
  invoiceNumber: string;

  @Column({type: 'enum', enum: SupplierInvoiceStatusEnum, default: SupplierInvoiceStatusEnum.ISSUED})
  status: SupplierInvoiceStatusEnum;

  @Column({type: 'date', nullable: false})
  issueDate: string;

  @Column({type: 'date', nullable: false})
  dueDate: string;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: false, name: 'net_amount'})
  netAmount: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: false, name: 'tax_amount'})
  taxAmount: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: false, name: 'gross_amount'})
  grossAmount: number;

  @Column({type: 'boolean', default: false})
  isExempt: boolean;

  @Column({type: 'boolean', default: false})
  isPaid: boolean;

  @Column({nullable: true})
  description?: string;

  @OneToMany(() => SupplierPaymentEntity, payment => payment.invoice)
  payments: SupplierPaymentEntity[];

  @ManyToOne(() => SupplierEntity, supplier => supplier.invoices)
  supplier: SupplierEntity;

  @ManyToOne(() => ExpenseTypesEntity, expenseType => expenseType.id)
  expenseType: ExpenseTypesEntity;
}
