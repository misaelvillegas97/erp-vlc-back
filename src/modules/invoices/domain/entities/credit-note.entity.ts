import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity }                                                 from './invoice.entity';
import { DateTime }                                                      from 'luxon';

@Entity({name: 'credit_notes'})
export class CreditNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({nullable: false, name: 'credit_note_number'})
  creditNoteNumber: string;

  @Column()
  amount: number;

  @Column({type: 'date', nullable: false, name: 'issuance_date'})
  issuanceDate: string = DateTime.now().toISODate();

  @Column({type: 'date', nullable: true, name: 'due_date'})
  dueDate?: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.creditNotes, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'invoice_id'})
  invoice: InvoiceEntity;

  constructor(partial?: Partial<CreditNoteEntity>) {
    Object.assign(this, partial);
  }
}
