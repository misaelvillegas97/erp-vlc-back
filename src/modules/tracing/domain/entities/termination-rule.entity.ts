import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { FlowVersionEntity }                            from './flow-version.entity';

/**
 * Termination Rule Entity
 * Defines rules for flow termination and automated actions
 * Contains conditions and actions to execute when conditions are met
 */
@Entity('tracing_termination_rule')
@Index([ 'flowVersionId', 'scope' ])
export class TerminationRuleEntity extends AbstractEntity {
  @Column({name: 'flow_version_id'})
  @Index()
  flowVersionId: string;

  @Column({
    type: 'enum',
    enum: [ 'STEP', 'FLOW' ]
  })
  scope: 'STEP' | 'FLOW';

  @Column({type: 'json', name: 'when_config'})
  whenConfig: {
    event: 'onStepEnd' | 'onFlowEnd';
    stepKey?: string;
  };

  @Column({type: 'text', name: 'condition_expr'})
  conditionExpr: string;

  @Column({type: 'json', name: 'actions_json'})
  actionsJson: Array<{
    type: 'SEND_EMAIL' | 'CANCEL_FLOW' | 'CREATE_ORDER' | 'INVENTORY_ADJUST' | 'CALL_WEBHOOK';
    [key: string]: any;
  }>;

  @Column()
  name: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  isActive: boolean;

  @Column({type: 'int', default: 0})
  @Index()
  priority: number;

  @Column({type: 'json', nullable: true, name: 'metadata'})
  metadata: Record<string, any> | null;

  // Relations
  @ManyToOne(() => FlowVersionEntity, (flowVersion) => flowVersion.terminationRules, {nullable: false})
  @JoinColumn({name: 'flow_version_id'})
  flowVersion: FlowVersionEntity;
}
