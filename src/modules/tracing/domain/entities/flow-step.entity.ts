import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { StepType }                                                from '../enums/step-type.enum';
import { FlowVersionEntity }                                       from './flow-version.entity';
import { FieldDefEntity }                                          from './field-def.entity';
import { StepExecutionEntity }                                     from './step-execution.entity';

/**
 * Flow Step Entity
 * Represents a step within a flow version
 * Contains position information for canvas-based builder
 */
@Entity('tracing_flow_step')
@Index([ 'flowVersionId', 'order' ])
export class FlowStepEntity extends AbstractEntity {
  @Column({name: 'flow_version_id'})
  @Index()
  flowVersionId: string;

  @Column({unique: false})
  @Index()
  key: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: StepType,
    default: StepType.STANDARD
  })
  type: StepType;

  @Column({type: 'json', nullable: true})
  position: { x: number; y: number } | null;

  @Column({type: 'int', default: 0})
  @Index()
  order: number;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'json', nullable: true, name: 'config_json'})
  configJson: Record<string, any> | null;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  isActive: boolean;

  // Relations
  @ManyToOne(() => FlowVersionEntity, (flowVersion) => flowVersion.steps, {nullable: false})
  @JoinColumn({name: 'flow_version_id'})
  flowVersion: FlowVersionEntity;

  @OneToMany(() => FieldDefEntity, (fieldDef) => fieldDef.step)
  fields: FieldDefEntity[];

  @OneToMany(() => StepExecutionEntity, (execution) => execution.step)
  executions: StepExecutionEntity[];
}
