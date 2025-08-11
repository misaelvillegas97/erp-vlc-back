import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                          from '@shared/domain/entities/abstract.entity';
import { FieldType }                                               from '../enums/field-type.enum';
import { FlowStepEntity }                                          from './flow-step.entity';
import { FieldCategoryEntity }                                     from './field-category.entity';
import { FieldValueEntity }                                        from './field-value.entity';

/**
 * Field Definition Entity
 * Defines dynamic fields for forms within flow steps
 * Contains validation rules and configuration
 */
@Entity('tracing_field_def')
@Index([ 'stepId', 'order' ])
export class FieldDefEntity extends AbstractEntity {
  @Column({name: 'step_id'})
  @Index()
  stepId: string;

  @Column({name: 'category_id', nullable: true})
  @Index()
  categoryId: string | null;

  @Column()
  @Index()
  key: string;

  @Column()
  label: string;

  @Column({
    type: 'enum',
    enum: FieldType
  })
  type: FieldType;

  @Column({type: 'boolean', default: false})
  required: boolean;

  @Column({type: 'json', nullable: true, name: 'config_json'})
  configJson: Record<string, any> | null;

  @Column({type: 'int', default: 0})
  @Index()
  order: number;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'text', nullable: true})
  placeholder: string;

  @Column({type: 'json', nullable: true, name: 'validation_rules'})
  validationRules: Record<string, any> | null;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  isActive: boolean;

  // Relations
  @ManyToOne(() => FlowStepEntity, (step) => step.fields, {nullable: false})
  @JoinColumn({name: 'step_id'})
  step: FlowStepEntity;

  @ManyToOne(() => FieldCategoryEntity, (category) => category.fields, {nullable: true})
  @JoinColumn({name: 'category_id'})
  category: FieldCategoryEntity | null;

  @OneToMany(() => FieldValueEntity, (fieldValue) => fieldValue.fieldDef)
  values: FieldValueEntity[];
}
