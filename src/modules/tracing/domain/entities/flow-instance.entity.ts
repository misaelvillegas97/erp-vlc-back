import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { FlowInstanceStatus }                                      from '../enums/execution-status.enum';
import { FlowTemplateEntity }                                      from './flow-template.entity';
import { StepExecutionEntity }                                     from './step-execution.entity';

/**
 * Flow Instance Entity
 * Represents an execution instance of a flow template
 * Tracks the overall execution state and progress
 */
@Entity('tracing_flow_instance')
@Index([ 'templateId', 'status' ])
@Index([ 'startedBy', 'status' ])
export class FlowInstanceEntity extends AbstractEntity {
  @Column({name: 'template_id'})
  @Index()
  templateId: string;

  @Column({type: 'int'})
  @Index()
  version: number;

  @Column({
    type: 'enum',
    enum: FlowInstanceStatus,
    default: FlowInstanceStatus.ACTIVE
  })
  @Index()
  status: FlowInstanceStatus;

  @Column({name: 'started_by'})
  @Index()
  startedBy: string;

  @Column({type: 'timestamp', name: 'started_at'})
  startedAt: Date;

  @Column({type: 'timestamp', nullable: true, name: 'finished_at'})
  finishedAt: Date | null;

  @Column({name: 'finished_by', nullable: true})
  finishedBy: string | null;

  @Column({type: 'text', nullable: true, name: 'cancellation_reason'})
  cancellationReason: string | null;

  @Column({type: 'json', nullable: true, name: 'context_data'})
  contextData: Record<string, any> | null;

  @Column({type: 'json', nullable: true, name: 'metadata'})
  metadata: Record<string, any> | null;

  // Relations
  @ManyToOne(() => FlowTemplateEntity, (template) => template.instances, {nullable: false})
  @JoinColumn({name: 'template_id'})
  template: FlowTemplateEntity;

  @OneToMany(() => StepExecutionEntity, (stepExecution) => stepExecution.instance)
  stepExecutions: StepExecutionEntity[];
}
