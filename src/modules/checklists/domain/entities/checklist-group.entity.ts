import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { ChecklistTemplateEntity }                                 from './checklist-template.entity';
import { CategoryEntity }                                          from './category.entity';
import { ChecklistExecutionEntity }                                from './checklist-execution.entity';

@Entity('checklist_group')
export class ChecklistGroupEntity extends AbstractEntity {
  @Column()
  name: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 1.0
  })
  weight: number;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  @Index()
  isActive: boolean;

  @Column('simple-array', {name: 'vehicle_types', nullable: true})
  vehicleTypes: string[];

  @Column('simple-array', {name: 'user_roles', nullable: true})
  userRoles: string[];

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 70.0,
    name: 'performance_threshold'
  })
  performanceThreshold: number;

  @Column('simple-json', {name: 'template_weights', nullable: true})
  templateWeights: Record<string, number>; // templateId -> weight (0-1)

  @ManyToMany(() => ChecklistTemplateEntity)
  @JoinTable({
    name: 'checklist_group_templates',
    joinColumn: {name: 'group_id', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'template_id', referencedColumnName: 'id'}
  })
  templates: ChecklistTemplateEntity[];

  @OneToMany(() => CategoryEntity, (category) => category.group)
  categories: CategoryEntity[];

  @OneToMany(() => ChecklistExecutionEntity, (execution) => execution.group)
  executions: ChecklistExecutionEntity[];
}
