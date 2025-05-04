import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from './vehicle.entity';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  SCHEDULED = 'SCHEDULED',
  EMERGENCY = 'EMERGENCY'
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('maintenance_records')
export class MaintenanceRecordEntity extends AbstractEntity {
  @ManyToOne(() => VehicleEntity, vehicle => vehicle.maintenanceRecords)
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @Column({name: 'vehicle_id'})
  vehicleId: string;

  @Column({type: 'date'})
  date: string;

  @Column({type: 'enum', enum: MaintenanceType})
  type: MaintenanceType;

  @Column({type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.PENDING})
  status: MaintenanceStatus;

  @Column({type: 'float'})
  odometer: number;

  @Column({nullable: true})
  description: string;

  @Column({type: 'decimal', precision: 10, scale: 2})
  cost: number;

  @Column({nullable: true})
  provider: string;

  @Column({type: 'simple-json', nullable: true})
  partsReplaced: { part: string; cost: number; quantity: number }[];

  @Column({type: 'simple-json', nullable: true})
  documents: { id: string; name: string; url: string }[];

  @Column({nullable: true})
  notes: string;
}
