import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from './vehicle.entity';

export enum AlertType {
  ODOMETER = 'ODOMETER',
  DATE = 'DATE',
  INSPECTION = 'INSPECTION',
  INSURANCE = 'INSURANCE',
  CIRCULATION_PERMIT = 'CIRCULATION_PERMIT'
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

@Entity('maintenance_alerts')
export class MaintenanceAlertEntity extends AbstractEntity {
  @ManyToOne(() => VehicleEntity, vehicle => vehicle.maintenanceAlerts)
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @Column({name: 'vehicle_id'})
  vehicleId: string;

  @Column({type: 'enum', enum: AlertType})
  type: AlertType;

  @Column({type: 'enum', enum: AlertStatus, default: AlertStatus.ACTIVE})
  status: AlertStatus;

  @Column()
  title: string;

  @Column({type: 'text'})
  description: string;

  @Column({type: 'date', nullable: true})
  dueDate: string;

  @Column({nullable: true})
  thresholdKm: number;

  @Column({type: 'boolean', default: false})
  notificationSent: boolean;

  @Column({nullable: true})
  priority: number; // 1-5, where 5 is the highest priority

  @Column({nullable: true, name: 'maintenance_record_id'})
  maintenanceRecordId: string;
}
