import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                                    from './vehicle.entity';
import { VehicleSessionLocationEntity }                     from './vehicle-session-location.entity';
import { UserEntity }                                       from '@modules/users/domain/entities/user.entity';
import { GpsEntity }                                        from '@modules/logistics/domain/entities/gps.entity';

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

  @Column({name: 'vehicle_id'})
  vehicleId: string;

  @ManyToOne(() => UserEntity, user => user.vehicleSessions)
  @JoinColumn({name: 'driver_id'})
  driver: UserEntity;

  @Column({name: 'driver_id'})
  driverId: string;

  @Column({name: 'start_time'})
  startTime: Date;

  @Column({nullable: true, name: 'end_time'})
  endTime: Date;

  @Column({type: 'float', name: 'initial_odometer'})
  initialOdometer: number;

  @Column({nullable: true, type: 'float', name: 'final_odometer'})
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

  @OneToMany(() => GpsEntity, gps => gps.vehicle, {
    cascade: true
  })
  gps?: GpsEntity[];

  @Column('simple-json', {nullable: true})
  images: { id: string, path: string }[];
}
