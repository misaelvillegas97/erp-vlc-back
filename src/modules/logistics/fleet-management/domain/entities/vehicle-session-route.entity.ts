import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AbstractEntity }                       from '@shared/domain/entities/abstract.entity';
import { VehicleSessionEntity }                 from './vehicle-session.entity';

/**
 * Entity for storing vehicle session route geometric data separately
 * This improves performance by allowing selective loading of route details
 */
@Entity('vehicle_session_route')
export class VehicleSessionRouteEntity extends AbstractEntity {
  @Column({name: 'session_id'})
  sessionId: string;

  @OneToOne(() => VehicleSessionEntity, session => session.routeDetails)
  @JoinColumn({name: 'session_id'})
  session: VehicleSessionEntity;

  @Column('simple-json')
  geometry: {
    coordinates: number[][];
    type: string;
  };

  @Column({type: 'float'})
  distance: number;

  @Column({type: 'float'})
  duration: number;

  @Column('simple-json', {nullable: true})
  legs: Array<{
    distance: number;
    duration: number;
    steps?: any[];
  }>;

  @Column('text', {nullable: true, name: 'all_matchings'})
  allMatchings: string; // JSON string of all OSRM matchings (compressed)

  @Column({type: 'int', nullable: true, name: 'total_matchings'})
  totalMatchings: number;

  @Column({type: 'int', nullable: true, name: 'coordinate_count'})
  coordinateCount: number;
}
