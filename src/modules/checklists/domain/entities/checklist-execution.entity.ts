import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { AbstractEntity }                                                    from '@shared/domain/entities/abstract.entity';
import { ChecklistTemplateEntity }                                           from './checklist-template.entity';
import { ChecklistGroupEntity }                                              from './checklist-group.entity';
import { ChecklistAnswerEntity }                                             from './checklist-answer.entity';
import { IncidentEntity }                                                    from './incident.entity';
import { ExecutionStatus }                                                   from '../enums/execution-status.enum';
import { TargetType }                                                        from '../enums/target-type.enum';
import { UserEntity }                                                        from '@modules/users/domain/entities/user.entity';

@Entity('checklist_execution')
export class ChecklistExecutionEntity extends AbstractEntity {
  @Column({name: 'template_id', nullable: true})
  templateId: string;

  @ManyToOne(() => ChecklistTemplateEntity, template => template.executions, {nullable: true})
  @JoinColumn({name: 'template_id'})
  template: ChecklistTemplateEntity;

  @Column({name: 'group_id', nullable: true})
  groupId: string;

  @ManyToOne(() => ChecklistGroupEntity, group => group.executions, {nullable: true})
  @JoinColumn({name: 'group_id'})
  group: ChecklistGroupEntity;

  @Column({name: 'executor_user_id'})
  executorUserId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({name: 'executor_user_id'})
  executorUser: UserEntity;

  @Column({
    type: 'enum',
    enum: TargetType,
    name: 'target_type'
  })
  @Index()
  targetType: TargetType;

  @Column({name: 'target_id'})
  @Index()
  targetId: string;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING
  })
  @Index()
  status: ExecutionStatus;

  @Column({type: 'timestamp with time zone', nullable: true, name: 'completed_at'})
  completedAt: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'total_score'
  })
  totalScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'max_possible_score'
  })
  maxPossibleScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'percentage_score'
  })
  percentageScore: number;

  @Column('simple-json', {nullable: true, name: 'category_scores'})
  categoryScores: Record<string, number>;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'group_score'
  })
  groupScore: number;

  @Column('simple-json', {nullable: true, name: 'template_scores'})
  templateScores: Record<string, number>;

  @Column({type: 'text', nullable: true})
  notes: string;

  @OneToMany(() => ChecklistAnswerEntity, (answer) => answer.execution)
  answers: ChecklistAnswerEntity[];

  @OneToOne(() => IncidentEntity, (incident) => incident.execution)
  incident: IncidentEntity;
}
