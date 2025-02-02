import { FileType }   from '@modules/files/domain/file';
import { Role }       from '@modules/roles/domain/role';
import { FileMapper } from '@modules/files/domain/mappers/file.mapper';
import { UserEntity } from '@modules/users/domain/entities/user.entity';

export class UserLightMapper {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly photo: FileType | null;
  readonly role: Role;
  readonly createdAt: Date;

  constructor(partial: Partial<UserLightMapper>) {
    Object.assign(this, partial);
  }

  static map(entity: UserEntity): UserLightMapper {
    const photo = entity.photo ? FileMapper.toDomain(entity.photo) : null;

    return new UserLightMapper({
      id: entity.id,
      name: `${ entity.firstName } ${ entity.lastName }`,
      email: entity.email,
      photo: photo,
      role: entity.role,
      createdAt: entity.createdAt,
    });
  }
}
