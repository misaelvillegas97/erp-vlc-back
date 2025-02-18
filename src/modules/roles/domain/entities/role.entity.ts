import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty }                   from '@nestjs/swagger';

import { EntityRelationalHelper } from '@shared/utils/relational-entity-helper';

@Entity({name: 'role'})
export class RoleEntity extends EntityRelationalHelper {
  @ApiProperty({type: Number})
  @PrimaryColumn()
  id: number;

  @ApiProperty({
    type: String,
    example: 'admin',
  })
  @Column()
  name?: string;

  constructor(partial?: Partial<RoleEntity>) {
    super();
    Object.assign(this, partial);
  }
}
