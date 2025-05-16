import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from '@modules/logistics/domain/entities/vehicle.entity';
import { VehicleSessionEntity }                  from '@modules/logistics/domain/entities/vehicle-session.entity';

@Entity('gps')
export class GpsEntity extends AbstractEntity {
  @Column({nullable: false, name: 'vehicle_id'})
  licensePlate: string;

  @Column({nullable: false})
  status: string;

  @Column({type: 'float', nullable: false})
  latitude: number;

  @Column({type: 'float', nullable: false})
  longitude: number;

  @Column({type: 'bigint', nullable: false})
  timestamp: number;

  @Column({type: 'json', nullable: true, name: 'last_locations'})
  lastLocations: Array<{ lat: number; lng: number }>;

  @Column({type: 'float', nullable: true})
  speed: number;

  @Column({type: 'float', nullable: true, name: 'total_distance'})
  totalDistance: number;

  @Column({type: 'varchar', length: 255, nullable: true, name: 'reference_id'})
  referenceId: string;

  @Column({type: 'varchar', length: 255, nullable: true, name: 'reference_name'})
  referenceName: string;

  @ManyToOne(() => VehicleEntity, vehicle => vehicle.gps, {nullable: true})
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @ManyToOne(() => VehicleSessionEntity, session => session.gps, {nullable: true})
  @JoinColumn({name: 'session_id'})
  vehicleSession: VehicleSessionEntity;
}
