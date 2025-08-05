import { Column, Entity, Index, OneToMany } from 'typeorm';
import { AbstractEntity }                   from '@shared/domain/entities/abstract.entity';
import { ChecklistType }                    from '../enums/checklist-type.enum';
import { TargetType }                       from '../enums/target-type.enum';
import { CategoryEntity }                   from './category.entity';
import { ChecklistExecutionEntity }         from './checklist-execution.entity';
import { RoleEnum }                         from '@modules/roles/roles.enum';

@Entity('checklist_template')
export class ChecklistTemplateEntity extends AbstractEntity {
  @Column({
    type: 'enum',
    enum: ChecklistType
  })
  @Index()
  type: ChecklistType;

  @Column()
  name: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({default: '1.0'})
  version: string;

  @Column('simple-array', {name: 'target_types', nullable: true})
  targetTypes: TargetType[];

  @Column('simple-array', {name: 'user_roles', nullable: true})
  userRoles: RoleEnum[];

  @Column({type: 'boolean', default: true, name: 'is_active'})
  @Index()
  isActive: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 70.0,
    name: 'performance_threshold'
  })
  performanceThreshold: number;

  @OneToMany(() => CategoryEntity, (category) => category.template)
  categories: CategoryEntity[];

  @OneToMany(() => ChecklistExecutionEntity, (execution) => execution.template)
  executions: ChecklistExecutionEntity[];
}
