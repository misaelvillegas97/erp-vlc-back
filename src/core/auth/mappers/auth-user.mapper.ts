import { FileEntity }   from '@modules/files/domain/entities/file.entity';
import { RoleEntity }   from '@modules/roles/domain/entities/role.entity';
import { StatusEntity } from '@modules/statuses/domain/entities/status.entity';
import { UserEntity }   from '@modules/users/domain/entities/user.entity';
import { User }         from '@modules/users/domain/user';
import { FileType }     from '@modules/files/domain/file';
import { Role }         from '@modules/roles/domain/role';
import { Status }       from '@modules/statuses/domain/status';

export class AuthUserMapper {
  public readonly id: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly email: string;
  public readonly photo?: FileEntity | FileType;
  public readonly role?: RoleEntity | Role;
  public readonly status?: StatusEntity | Status;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(values: Partial<AuthUserMapper>) {
    Object.assign(this, values);
  }

  static map(entity: UserEntity | User): AuthUserMapper {
    return new AuthUserMapper({
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      photo: entity.photo,
      role: entity.role,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

}
