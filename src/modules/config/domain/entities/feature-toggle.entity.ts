import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feature_toggles')
export class FeatureToggleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({type: 'varchar', length: 255, unique: true})
  name: string;

  @Column({type: 'varchar', length: 255})
  displayName: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'boolean', default: false})
  enabled: boolean;

  @Column({type: 'varchar', length: 50, nullable: true})
  category: string;

  @Column({type: 'json', nullable: true})
  metadata: Record<string, any>;

  @Column({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @Column({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'})
  updatedAt: Date;
}
