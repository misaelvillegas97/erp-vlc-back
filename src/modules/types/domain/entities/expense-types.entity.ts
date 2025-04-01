import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';
import { Transform }      from 'class-transformer';

@Entity('expense_types')
export class ExpenseTypesEntity extends AbstractEntity {
  @Column({nullable: false})
  @Transform(({value}) => value?.toUpperCase())
  name: string;

  @Column({nullable: false})
  description: string;
}
