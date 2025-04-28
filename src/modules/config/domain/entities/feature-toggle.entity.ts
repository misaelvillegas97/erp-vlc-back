import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { RequiredMetadataModel }                            from '@modules/config/domain/required-metadata.model';

@Entity('feature_toggles')
export class FeatureToggleEntity extends AbstractEntity {
  @Column({type: 'varchar', length: 255, unique: true})
  name: string;

  @Column({type: 'varchar', length: 255, name: 'display_name'})
  displayName: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'boolean', default: false})
  enabled: boolean;

  @Column({type: 'varchar', length: 50, nullable: true})
  category: string;

  @Column({type: 'json', nullable: true})
  metadata: Record<string, any>;

  @Column({type: 'json', nullable: true, name: 'required_metadata'})
  requiredMetadata: RequiredMetadataModel[];

  // Parent-child relationship
  @Column({type: 'uuid', nullable: true, name: 'parent_id'})
  parentId: string;

  @ManyToOne(() => FeatureToggleEntity, feature => feature.children, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'parent_id'})
  parent: FeatureToggleEntity;

  @OneToMany(() => FeatureToggleEntity, feature => feature.parent)
  children: FeatureToggleEntity[];
}
