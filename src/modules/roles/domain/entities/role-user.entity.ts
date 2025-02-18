import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { v4 }                                                   from 'uuid';
import { UserEntity }                                           from '@modules/users/domain/entities/user.entity';
import { RoleEntity }                                           from '@modules/roles/domain/entities/role.entity';

@Entity({name: 'role_user'})
export class RoleUserEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  userId: string;

  @Column()
  roleId: number;

  @ManyToOne(() => UserEntity, (user) => user.roles)
  @JoinColumn({name: 'userId'})
  user: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.id)
  @JoinColumn({name: 'roleId'})
  role: RoleEntity;

  constructor(partial: Partial<RoleUserEntity>) {
    Object.assign(this, partial);
  }
}
