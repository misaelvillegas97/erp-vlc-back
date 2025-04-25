import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ApiProperty }                              from '@nestjs/swagger';

import { EntityRelationalHelper } from '@shared/utils/relational-entity-helper';
import { RoleUserEntity }         from '@modules/roles/domain/entities/role-user.entity';

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

  @OneToMany(() => RoleUserEntity, (roleUser) => roleUser.role, {cascade: true})
  users: RoleUserEntity[];

  constructor(partial?: Partial<RoleEntity>) {
    super();
    Object.assign(this, partial);
  }
}
