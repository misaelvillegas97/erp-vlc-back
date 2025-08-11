import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { StepExecutionEntity }                          from './step-execution.entity';

/**
 * Order Link Entity
 * Links step executions to orders (existing or newly created)
 * Tracks the relationship between flow execution and order management
 */
@Entity('tracing_order_link')
@Index([ 'stepExecutionId', 'orderId' ])
export class OrderLinkEntity extends AbstractEntity {
  @Column({name: 'step_execution_id'})
  @Index()
  stepExecutionId: string;

  @Column({name: 'order_id'})
  @Index()
  orderId: string;

  @Column({
    type: 'enum',
    enum: [ 'LINKED', 'CREATED' ]
  })
  mode: 'LINKED' | 'CREATED';

  @Column({type: 'json', nullable: true, name: 'link_metadata'})
  linkMetadata: Record<string, any> | null;

  @Column({name: 'linked_by'})
  linkedBy: string;

  @Column({type: 'timestamp', name: 'linked_at'})
  linkedAt: Date;

  @Column({type: 'text', nullable: true})
  notes: string;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  isActive: boolean;

  // Relations
  @ManyToOne(() => StepExecutionEntity, (stepExecution) => stepExecution.orderLinks, {nullable: false})
  @JoinColumn({name: 'step_execution_id'})
  stepExecution: StepExecutionEntity;
}
