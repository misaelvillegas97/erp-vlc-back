import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleEntity }                         from '@modules/logistics/fleet-management/domain/entities/vehicle.entity';
import { VehicleSessionEntity }                  from '@modules/logistics/fleet-management/domain/entities/vehicle-session.entity';
import { GPSProviderEnum }                       from '@modules/gps/domain/enums/provider.enum';

@Entity('gps')
export class GpsEntity extends AbstractEntity {
  @Column({nullable: false, name: 'license_plate'})
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

  @Column({
    type: 'enum',
    nullable: true,
    name: 'provider',
    enum: GPSProviderEnum
  })
  provider: string;

  @ManyToOne(() => VehicleEntity, vehicle => vehicle.gps, {nullable: true})
  @JoinColumn({name: 'vehicle_id'})
  vehicle: VehicleEntity;

  @ManyToOne(() => VehicleSessionEntity, session => session.gps, {nullable: true})
  @JoinColumn({name: 'session_id'})
  vehicleSession: VehicleSessionEntity;
}
