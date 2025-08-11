import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { StepExecutionStatus }                                     from '../enums/execution-status.enum';
import { FlowInstanceEntity }                                      from './flow-instance.entity';
import { FlowStepEntity }                                          from './flow-step.entity';
import { FieldValueEntity }                                        from './field-value.entity';
import { WasteRecordEntity }                                       from './waste-record.entity';
import { OrderLinkEntity }                                         from './order-link.entity';

/**
 * Step Execution Entity
 * Represents the execution of a specific step within a flow instance
 * Tracks step-level execution state and timing
 */
@Entity('tracing_step_execution')
@Index([ 'instanceId', 'status' ])
@Index([ 'stepId', 'status' ])
export class StepExecutionEntity extends AbstractEntity {
  @Column({name: 'instance_id'})
  @Index()
  instanceId: string;

  @Column({name: 'step_id'})
  @Index()
  stepId: string;

  @Column({
    type: 'enum',
    enum: StepExecutionStatus,
    default: StepExecutionStatus.PENDING
  })
  @Index()
  status: StepExecutionStatus;

  @Column({type: 'timestamp', nullable: true, name: 'started_at'})
  startedAt: Date | null;

  @Column({type: 'timestamp', nullable: true, name: 'finished_at'})
  finishedAt: Date | null;

  @Column({name: 'actor_id', nullable: true})
  @Index()
  actorId: string | null;

  @Column({type: 'text', nullable: true, name: 'completion_notes'})
  completionNotes: string | null;

  @Column({type: 'json', nullable: true, name: 'execution_data'})
  executionData: Record<string, any> | null;

  @Column({type: 'boolean', default: false, name: 'has_errors'})
  hasErrors: boolean;

  @Column({type: 'json', nullable: true, name: 'error_details'})
  errorDetails: Record<string, any> | null;

  // Relations
  @ManyToOne(() => FlowInstanceEntity, (instance) => instance.stepExecutions, {nullable: false})
  @JoinColumn({name: 'instance_id'})
  instance: FlowInstanceEntity;

  @ManyToOne(() => FlowStepEntity, (step) => step.executions, {nullable: false})
  @JoinColumn({name: 'step_id'})
  step: FlowStepEntity;

  @OneToMany(() => FieldValueEntity, (fieldValue) => fieldValue.stepExecution)
  fieldValues: FieldValueEntity[];

  @OneToMany(() => WasteRecordEntity, (wasteRecord) => wasteRecord.stepExecution)
  wasteRecords: WasteRecordEntity[];

  @OneToMany(() => OrderLinkEntity, (orderLink) => orderLink.stepExecution)
  orderLinks: OrderLinkEntity[];
}
