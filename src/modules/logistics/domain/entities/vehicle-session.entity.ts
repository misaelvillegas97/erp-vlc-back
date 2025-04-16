import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                                    from './vehicle.entity';
import { DriverEntity }                                     from './driver.entity';
import { VehicleSessionLocationEntity }                     from './vehicle-session-location.entity';

export enum VehicleSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

@Entity('vehicle_session')
export class VehicleSessionEntity extends AbstractEntity {
  @ManyToOne(() => VehicleEntity, vehicle => vehicle.sessions)
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @Column()
  vehicleId: string;

  @ManyToOne(() => DriverEntity, driver => driver.sessions)
  @JoinColumn({name: 'driver_id'})
  driver: DriverEntity;

  @Column()
  driverId: string;

  @Column()
  startTime: Date;

  @Column({nullable: true})
  endTime: Date;

  @Column({type: 'float'})
  initialOdometer: number;

  @Column({nullable: true, type: 'float'})
  finalOdometer: number;

  @Column({
    type: 'enum',
    enum: VehicleSessionStatus,
    default: VehicleSessionStatus.ACTIVE
  })
  status: VehicleSessionStatus;

  @Column({nullable: true})
  purpose: string;

  @Column({nullable: true})
  observations: string;

  @Column({nullable: true})
  incidents: string;

  @OneToMany(() => VehicleSessionLocationEntity, location => location.session, {
    cascade: true,
    eager: true
  })
  locations: VehicleSessionLocationEntity[];

  @Column('simple-json', {nullable: true})
  images: { id: string, path: string }[];
}
