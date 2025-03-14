import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { InvoiceStatusEnum }                                        from '@modules/orders/domain/enums/invoice-status.enum';
import { AbstractEntity }                                           from '@shared/domain/entities/abstract.entity';
import { OrderEntity }                                              from '@modules/orders/domain/entities/order.entity';
import { ClientEntity }                                             from '@modules/clients/domain/entities/client.entity';
import { UserEntity }                                               from '@modules/users/domain/entities/user.entity';
import { CreditNoteEntity }                                         from '@modules/invoices/domain/entities/credit-note.entity';
import { PaymentEntity }                                            from '@modules/invoices/domain/entities/payment.entity';

@Entity({name: 'invoices'})
@Unique([ 'invoiceNumber' ])
export class InvoiceEntity extends AbstractEntity {
  @Column({nullable: false, name: 'invoice_number'})
  invoiceNumber: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatusEnum,
    default: InvoiceStatusEnum.ISSUED
  })
  status: InvoiceStatusEnum;

  @Column({nullable: true})
  observations?: string;

  @Column({type: 'date', nullable: false, name: 'emission_date'})
  emissionDate: string;

  @Column({type: 'date', nullable: true, name: 'due_date'})
  dueDate?: string;

  @Column({type: 'timestamp', nullable: true, name: 'payment_date'})
  paymentDate?: Date;

  @Column({nullable: false, name: 'net_amount'})
  netAmount: number;

  @Column({nullable: false, name: 'tax_amount'})
  taxAmount: number;

  @Column({nullable: false, name: 'total_amount'})
  totalAmount: number;

  @Column({nullable: false, default: false, name: 'is_paid'})
  isPaid: boolean;

  @Column({nullable: false, default: true, name: 'is_active'})
  isActive: boolean = true;

  @ManyToOne(() => OrderEntity, (order) => order.invoices, {onDelete: 'CASCADE'})
  order: OrderEntity;

  @ManyToOne(() => ClientEntity, client => client.id)
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  @OneToMany(() => CreditNoteEntity, (creditNote) => creditNote.invoice, {cascade: true})
  creditNotes: CreditNoteEntity[];

  @OneToMany(() => PaymentEntity, payment => payment.invoice)
  payments: PaymentEntity[];

  // Delivery assignment
  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({name: 'delivery_assignment_id'})
  deliveryAssignment?: UserEntity;

}
