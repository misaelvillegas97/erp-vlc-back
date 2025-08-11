import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { StepExecutionEntity }                          from './step-execution.entity';
import { FieldDefEntity }                               from './field-def.entity';

/**
 * Field Value Entity
 * Stores the actual values entered for dynamic fields during step execution
 * Contains validation status and metadata
 */
@Entity('tracing_field_value')
@Index([ 'stepExecutionId', 'fieldDefId' ], {unique: true})
export class FieldValueEntity extends AbstractEntity {
  @Column({name: 'step_execution_id'})
  @Index()
  stepExecutionId: string;

  @Column({name: 'field_def_id'})
  @Index()
  fieldDefId: string;

  @Column({type: 'json', name: 'value_json'})
  valueJson: any;

  @Column({type: 'boolean', default: true})
  valid: boolean;

  @Column({type: 'json', nullable: true, name: 'validation_errors'})
  validationErrors: string[] | null;

  @Column({type: 'text', nullable: true, name: 'raw_value'})
  rawValue: string | null;

  @Column({type: 'json', nullable: true, name: 'metadata'})
  metadata: Record<string, any> | null;

  @Column({type: 'timestamp', nullable: true, name: 'entered_at'})
  enteredAt: Date | null;

  @Column({name: 'entered_by', nullable: true})
  enteredBy: string | null;

  // Relations
  @ManyToOne(() => StepExecutionEntity, (stepExecution) => stepExecution.fieldValues, {nullable: false})
  @JoinColumn({name: 'step_execution_id'})
  stepExecution: StepExecutionEntity;

  @ManyToOne(() => FieldDefEntity, (fieldDef) => fieldDef.values, {nullable: false})
  @JoinColumn({name: 'field_def_id'})
  fieldDef: FieldDefEntity;
}
