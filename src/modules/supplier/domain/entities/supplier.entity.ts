import { Column, Entity, OneToMany } from 'typeorm';
import { SupplierTypeEnum }          from '@modules/supplier/domain/enums/supplier-type.enum';
import { SupplierInvoiceEntity }     from '@modules/supplier-invoices/domain/entities/supplier-invoice.entity';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';

@Entity('suppliers')
export class SupplierEntity extends AbstractEntity {

  @Column({type: 'varchar', length: 12, unique: true})
  rut: string;

  @Column({type: 'varchar', length: 100})
  businessName: string;

  @Column({type: 'varchar', length: 100, nullable: true})
  fantasyName: string;

  @Column({
    type: 'enum',
    enum: SupplierTypeEnum,
    default: SupplierTypeEnum.JURIDICA
  })
  type: SupplierTypeEnum;

  @Column({type: 'varchar', length: 100, nullable: true})
  economicActivity: string;

  @Column({type: 'varchar', length: 200, nullable: true})
  address: string;

  @Column({type: 'varchar', length: 100, nullable: true})
  city: string;

  @Column({type: 'varchar', length: 20, nullable: true})
  phone: string;

  @Column({type: 'varchar', length: 100})
  email: string;

  @Column({type: 'varchar', length: 100, nullable: true})
  contactPerson: string;

  @Column({type: 'varchar', length: 20, nullable: true})
  contactPhone: string;

  @Column({type: 'boolean', default: true})
  isActive: boolean;

  @Column({type: 'text', nullable: true})
  notes: string;

  @Column({type: 'simple-array', nullable: true})
  tags: string[];

  @Column({type: 'integer', default: 30})
  paymentTermDays: number; // Plazo de pago en días

  @OneToMany(() => SupplierInvoiceEntity, (invoice) => invoice.supplier)
  invoices: SupplierInvoiceEntity[];
}
