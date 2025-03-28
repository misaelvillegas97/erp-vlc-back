import { Column, Entity, ManyToOne } from 'typeorm';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';
import { SupplierInvoiceEntity }     from '@modules/supplier-invoices/domain/entities/supplier-invoice.entity';

@Entity('supplier_invoices_observations')
export class SupplierInvoiceObservationsEntity extends AbstractEntity {
  @Column({type: 'text', nullable: false})
  observation: string;

  @ManyToOne(() => SupplierInvoiceEntity, (invoice) => invoice.id)
  invoice: SupplierInvoiceObservationsEntity;
}
