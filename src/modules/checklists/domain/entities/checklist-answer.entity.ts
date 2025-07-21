import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { ChecklistExecutionEntity }                     from './checklist-execution.entity';
import { QuestionEntity }                               from './question.entity';
import { ApprovalStatus }                               from '../enums/approval-status.enum';

@Entity('checklist_answer')
export class ChecklistAnswerEntity extends AbstractEntity {
  @Column({name: 'execution_id'})
  executionId: string;

  @ManyToOne(() => ChecklistExecutionEntity, (execution) => execution.answers)
  @JoinColumn({name: 'execution_id'})
  execution: ChecklistExecutionEntity;

  @Column({name: 'question_id'})
  questionId: string;

  @ManyToOne(() => QuestionEntity, (question) => question.answers)
  @JoinColumn({name: 'question_id'})
  question: QuestionEntity;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    name: 'approval_status'
  })
  @Index()
  approvalStatus: ApprovalStatus;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    name: 'approval_value'
  })
  approvalValue: number;

  @Column({type: 'text', nullable: true, name: 'evidence_file'})
  evidenceFile: string;

  @Column({type: 'text', nullable: true})
  comment: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    name: 'answer_score'
  })
  answerScore: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    name: 'max_score'
  })
  maxScore: number;

  @Column({type: 'boolean', default: false, name: 'is_skipped'})
  isSkipped: boolean;

  @Column({type: 'timestamp with time zone', name: 'answered_at'})
  @Index()
  answeredAt: Date;
}
