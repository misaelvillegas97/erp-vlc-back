import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { CategoryEntity }                                          from './category.entity';
import { ChecklistAnswerEntity }                                   from './checklist-answer.entity';

@Entity('checklist_template_category_question')
export class QuestionEntity extends AbstractEntity {
  @Column()
  title: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 1.0
  })
  weight: number;

  @Column({type: 'boolean', default: false})
  required: boolean;

  @Column({type: 'boolean', default: false, name: 'has_intermediate_approval'})
  hasIntermediateApproval: boolean;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0.5,
    name: 'intermediate_value'
  })
  intermediateValue: number;

  @Column('simple-json', {nullable: true, name: 'extra_fields'})
  extraFields: Record<string, any>;

  @Column({type: 'integer', default: 0, name: 'sort_order'})
  sortOrder: number;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  @Index()
  isActive: boolean;

  @Column({name: 'category_id'})
  categoryId: string;

  @ManyToOne(() => CategoryEntity, (category) => category.questions)
  @JoinColumn({name: 'category_id'})
  category: CategoryEntity;

  @OneToMany(() => ChecklistAnswerEntity, (answer) => answer.question)
  answers: ChecklistAnswerEntity[];
}
