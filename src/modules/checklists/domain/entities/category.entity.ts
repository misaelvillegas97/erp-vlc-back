import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { ChecklistTemplateEntity }                          from './checklist-template.entity';
import { QuestionEntity }                                   from './question.entity';
import { ChecklistGroupEntity }                             from './checklist-group.entity';

@Entity('checklist_template_category')
export class CategoryEntity extends AbstractEntity {
  @Column()
  title: string;

  @Column({type: 'text', nullable: true})
  description: string;


  @Column({type: 'integer', default: 0, name: 'sort_order'})
  sortOrder: number;

  @Column({name: 'template_id', nullable: true})
  templateId: string;

  @ManyToOne(() => ChecklistTemplateEntity, (template) => template.categories, {nullable: true})
  @JoinColumn({name: 'template_id'})
  template: ChecklistTemplateEntity;

  @Column({name: 'group_id', nullable: true})
  groupId: string;

  @ManyToOne(() => ChecklistGroupEntity, (group) => group.categories, {nullable: true})
  @JoinColumn({name: 'group_id'})
  group: ChecklistGroupEntity;

  @OneToMany(() => QuestionEntity, (question) => question.category)
  questions: QuestionEntity[];
}
