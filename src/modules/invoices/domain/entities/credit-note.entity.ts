import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InvoiceEntity }                                     from './invoice.entity';
import { DateTime }                                          from 'luxon';

@Entity({name: 'credit_notes'})
export class CreditNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creditNoteNumber: string;

  @Column()
  amount: number;

  @Column({type: 'date'})
  issuanceDate: string = DateTime.now().toISODate();

  @Column({type: 'date', nullable: true})
  dueDate?: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.creditNotes, {onDelete: 'CASCADE'})
  invoice: InvoiceEntity;

  constructor(partial?: Partial<CreditNoteEntity>) {
    Object.assign(this, partial);
  }
}
