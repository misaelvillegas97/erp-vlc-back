import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { VehicleSessionEntity }                  from './vehicle-session.entity';

@Entity('vehicle_session_location')
export class VehicleSessionLocationEntity extends AbstractEntity {
  @ManyToOne(() => VehicleSessionEntity, session => session.locations)
  @JoinColumn({name: 'session_id'})
  session: VehicleSessionEntity;

  @Column({name: 'session_id'})
  sessionId: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column({nullable: true, type: 'float'})
  altitude: number;

  @Column({nullable: true, type: 'float'})
  speed: number;

  @Column({nullable: true, type: 'float'})
  accuracy: number;

  @Column()
  timestamp: Date;

  @Column({nullable: true})
  address: string;

  @Column({default: false, name: 'is_start_location'})
  isInitialLocation: boolean;

  @Column({default: false, name: 'is_end_location'})
  isFinalLocation: boolean;

  // We're not using PostGIS extension, so we'll create indexes on lat/lon directly
  @Column({name: 'geolocation_json', type: 'json', nullable: true})
  geolocationJson: object; // Will store a GeoJSON representation: { type: "Point", coordinates: [longitude, latitude] }
}
