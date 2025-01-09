import { ApiProperty }                   from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { EntityRelationalHelper } from '@shared/utils/relational-entity-helper';

@Entity({
  name: 'status',
})
export class StatusEntity extends EntityRelationalHelper {
  @ApiProperty({
    type: Number,
  })
  @PrimaryColumn()
  id: number;

  @ApiProperty({
    type: String,
    example: 'active',
  })
  @Column()
  name?: string;
}
