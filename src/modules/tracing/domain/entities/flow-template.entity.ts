import { Column, Entity, Index, OneToMany } from 'typeorm';
import { AbstractEntity }                   from '@shared/domain/entities/abstract.entity';
import { FlowVersionEntity }                from './flow-version.entity';
import { FlowInstanceEntity }               from './flow-instance.entity';

/**
 * Flow Template Entity
 * Represents a template for creating flow versions
 * Contains basic information about the flow process
 */
@Entity('tracing_flow_template')
export class FlowTemplateEntity extends AbstractEntity {
  @Column()
  @Index()
  name: string;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'boolean', default: true, name: 'is_active'})
  @Index()
  isActive: boolean;

  // Relations
  @OneToMany(() => FlowVersionEntity, (version) => version.template)
  versions: FlowVersionEntity[];

  @OneToMany(() => FlowInstanceEntity, (instance) => instance.template)
  instances: FlowInstanceEntity[];
}
