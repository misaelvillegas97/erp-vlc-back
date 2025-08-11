import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { FlowVersionStatus }                                       from '../enums/flow-version-status.enum';
import { FlowTemplateEntity }                                      from './flow-template.entity';
import { FlowStepEntity }                                          from './flow-step.entity';
import { FieldCategoryEntity }                                     from './field-category.entity';
import { TerminationRuleEntity }                                   from './termination-rule.entity';

/**
 * Flow Version Entity
 * Represents a specific version of a flow template
 * Versions are immutable once published
 */
@Entity('tracing_flow_version')
@Index([ 'templateId', 'status' ])
export class FlowVersionEntity extends AbstractEntity {
  @Column({name: 'template_id'})
  @Index()
  templateId: string;

  @Column({type: 'int'})
  @Index()
  version: number;

  @Column({
    type: 'enum',
    enum: FlowVersionStatus,
    default: FlowVersionStatus.DRAFT
  })
  @Index()
  status: FlowVersionStatus;

  @Column({type: 'timestamp', nullable: true, name: 'published_at'})
  publishedAt: Date | null;

  @Column({nullable: true, name: 'schema_hash'})
  schemaHash: string;

  @Column({type: 'text', nullable: true})
  notes: string;

  @Column({name: 'published_by', nullable: true})
  publishedBy: string;

  // Relations
  @ManyToOne(() => FlowTemplateEntity, (template) => template.versions, {nullable: false})
  @JoinColumn({name: 'template_id'})
  template: FlowTemplateEntity;

  @OneToMany(() => FlowStepEntity, (step) => step.flowVersion)
  steps: FlowStepEntity[];

  @OneToMany(() => FieldCategoryEntity, (category) => category.flowVersion)
  categories: FieldCategoryEntity[];

  @OneToMany(() => TerminationRuleEntity, (rule) => rule.flowVersion)
  terminationRules: TerminationRuleEntity[];
}
