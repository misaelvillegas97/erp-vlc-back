import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';
import { VehicleSessionEntity }      from './vehicle-session.entity';
import { FileEntity }                from '@modules/files/domain/entities/file.entity';

export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance'
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  PICKUP = 'pickup',
  VAN = 'van',
  TRUCK = 'truck',
  OTHER = 'other'
}

@Entity('vehicle')
export class VehicleEntity extends AbstractEntity {
  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column()
  licensePlate: string;

  @Column({nullable: true})
  vin: string;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE
  })
  status: VehicleStatus;

  @Column({
    type: 'enum',
    enum: VehicleType,
    default: VehicleType.SEDAN
  })
  type: VehicleType;

  @Column({type: 'float'})
  currentOdometer: number;

  @Column({nullable: true})
  lastMaintenanceDate: Date;

  @Column({nullable: true})
  nextMaintenanceDate: Date;

  @Column({nullable: true})
  maintenanceNotes: string;

  @Column({nullable: true})
  color: string;

  @Column({nullable: true})
  fuelType: string;

  @OneToMany(() => VehicleSessionEntity, session => session.vehicle)
  sessions: VehicleSessionEntity[];

  @Column('simple-json', {nullable: true})
  images: { id: string, path: string }[];
}
