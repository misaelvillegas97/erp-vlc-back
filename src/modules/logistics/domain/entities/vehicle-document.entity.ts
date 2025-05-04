import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from './vehicle.entity';
import { FileEntity }                            from '@modules/files/domain/entities/file.entity';

export enum DocumentType {
  INSURANCE = 'INSURANCE',
  TECHNICAL_INSPECTION = 'TECHNICAL_INSPECTION',
  CIRCULATION_PERMIT = 'CIRCULATION_PERMIT',
  PURCHASE = 'PURCHASE',
  OTHER = 'OTHER'
}

@Entity('vehicle_documents')
export class VehicleDocumentEntity extends AbstractEntity {
  @ManyToOne(() => VehicleEntity, vehicle => vehicle.documents)
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @Column({name: 'vehicle_id'})
  vehicleId: string;

  @ManyToOne(() => FileEntity, {eager: true})
  @JoinColumn({name: 'file_id'})
  file: FileEntity;

  @Column({name: 'file_id'})
  fileId: string;

  @Column({type: 'enum', enum: DocumentType})
  type: DocumentType;

  @Column()
  name: string;

  @Column({type: 'date', nullable: true, name: 'expiry_date'})
  expiryDate?: string;

  @Column({nullable: true})
  notes?: string;
}
