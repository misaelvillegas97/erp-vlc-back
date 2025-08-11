import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { FlowVersionEntity }                                       from './flow-version.entity';
import { FieldDefEntity }                                          from './field-def.entity';

/**
 * Field Category Entity
 * Represents a category for grouping dynamic fields within a flow version
 * Used for organizing form fields in the UI
 */
@Entity('tracing_field_category')
@Index([ 'flowVersionId', 'order' ])
export class FieldCategoryEntity extends AbstractEntity {
  @Column({name: 'flow_version_id'})
  @Index()
  flowVersionId: string;

  @Column()
  name: string;

  @Column({type: 'int', default: 0})
  @Index()
  order: number;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  isActive: boolean;

  @Column({type: 'json', nullable: true, name: 'config_json'})
  configJson: Record<string, any> | null;

  // Relations
  @ManyToOne(() => FlowVersionEntity, (flowVersion) => flowVersion.categories, {nullable: false})
  @JoinColumn({name: 'flow_version_id'})
  flowVersion: FlowVersionEntity;

  @OneToMany(() => FieldDefEntity, (fieldDef) => fieldDef.category)
  fields: FieldDefEntity[];
}
