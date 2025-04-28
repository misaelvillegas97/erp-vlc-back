import { Column, Entity, ManyToOne } from 'typeorm';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }             from '@modules/logistics/domain/entities/vehicle.entity';
import { VehicleSessionEntity }      from '@modules/logistics/domain/entities/vehicle-session.entity';

@Entity('gps')
export class GpsEntity extends AbstractEntity {
  @Column({nullable: false})
  licensePlate: string;

  @Column({nullable: false})
  status: string;

  @Column({type: 'float', nullable: false})
  latitude: number;

  @Column({type: 'float', nullable: false})
  longitude: number;

  @Column({type: 'bigint', nullable: false})
  timestamp: number;

  @Column({type: 'json', nullable: true})
  lastLocations: Array<{ lat: number; lng: number }>;

  @Column({type: 'float', nullable: true})
  speed: number;

  @Column({type: 'float', nullable: true})
  totalDistance: number;

  @ManyToOne(() => VehicleEntity, vehicle => vehicle.gps, {nullable: true})
  vehicle: VehicleEntity;

  @ManyToOne(() => VehicleSessionEntity, session => session.gps, {nullable: true})
  vehicleSession: VehicleSessionEntity;
}
