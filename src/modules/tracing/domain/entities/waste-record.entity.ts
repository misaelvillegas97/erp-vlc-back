import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { StepExecutionEntity }                          from './step-execution.entity';

/**
 * Waste Record Entity
 * Records waste/loss during step execution
 * Can impact inventory and cost calculations
 */
@Entity('tracing_waste_record')
@Index([ 'stepExecutionId' ])
export class WasteRecordEntity extends AbstractEntity {
  @Column({name: 'step_execution_id'})
  stepExecutionId: string;

  @Column({type: 'decimal', precision: 10, scale: 3})
  qty: number;

  @Column()
  reason: string;

  @Column({type: 'boolean', default: false, name: 'affects_inventory'})
  @Index()
  affectsInventory: boolean;

  @Column({type: 'text', nullable: true, name: 'evidence_url'})
  evidenceUrl: string | null;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cost_impact'})
  costImpact: number | null;

  @Column({nullable: true})
  sku: string | null;

  @Column({nullable: true})
  lot: string | null;

  @Column({type: 'text', nullable: true})
  notes: string;

  @Column({type: 'json', nullable: true, name: 'metadata'})
  metadata: Record<string, any> | null;

  @Column({name: 'recorded_by'})
  recordedBy: string;

  @Column({type: 'timestamp', name: 'recorded_at'})
  recordedAt: Date;

  @Column({type: 'boolean', default: false, name: 'inventory_adjusted'})
  inventoryAdjusted: boolean;

  @Column({type: 'timestamp', nullable: true, name: 'adjustment_processed_at'})
  adjustmentProcessedAt: Date | null;

  // Relations
  @ManyToOne(() => StepExecutionEntity, (stepExecution) => stepExecution.wasteRecords, {nullable: false})
  @JoinColumn({name: 'step_execution_id'})
  stepExecution: StepExecutionEntity;
}
