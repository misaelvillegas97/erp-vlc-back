import { FileEntity }          from '@modules/files/domain/entities/file.entity';
import { FileMapper }          from '@modules/files/domain/mappers/file.mapper';
import { RoleEntity }          from '@modules/roles/domain/entities/role.entity';
import { StatusEntity }        from '@modules/statuses/domain/entities/status.entity';
import { User }                from '../user';
import { UserEntity }          from '../entities/user.entity';
import { isUUID }              from 'class-validator';
import { DriverLicenseEntity } from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }      from '@modules/roles/domain/entities/role-user.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const domainEntity = new User();
    domainEntity.id = raw.id;
    domainEntity.name = `${ raw.firstName } ${ raw.lastName }`;
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.previousPassword = raw.previousPassword;
    domainEntity.provider = raw.provider;
    domainEntity.socialId = raw.socialId;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;
    domainEntity.role = raw.role;
    domainEntity.roles = raw.roles;
    domainEntity.status = raw.status;
    domainEntity.documentId = raw.documentId;
    domainEntity.driverLicense = raw.driverLicense;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;

    domainEntity.tenantId = raw.tenantId;
    domainEntity.tenant = raw.tenant;

    if (raw.photo) domainEntity.photo = FileMapper.toDomain(raw.photo);

    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserEntity {
    let role: RoleEntity | undefined = undefined;

    if (domainEntity.role) {
      role = new RoleEntity();
      role.id = Number(domainEntity.role.id);
    }

    let photo: FileEntity | undefined | null = undefined;

    if (domainEntity.photo) {
      photo = new FileEntity();
      photo.id = domainEntity.photo.id;
      photo.path = domainEntity.photo.path;
    } else if (domainEntity.photo === null) {
      photo = null;
    }

    let status: StatusEntity | undefined = undefined;

    if (domainEntity.status) {
      status = new StatusEntity();
      status.id = Number(domainEntity.status.id);
    }

    const persistenceEntity = new UserEntity();
    if (domainEntity.id && isUUID(domainEntity.id)) {
      persistenceEntity.id = domainEntity.id;
    }

    if (domainEntity.role) {
      const role = new RoleEntity();
      role.id = Number(domainEntity.role.id);

      const roleUser = new RoleUserEntity({
        role: role
      });

      if (!persistenceEntity.roles) persistenceEntity.roles = [];

      persistenceEntity.roles.push(roleUser);
    }

    if (domainEntity.driverLicense) {
      if (!persistenceEntity.driverLicense) persistenceEntity.driverLicense = [];

      for (const driverLicense of domainEntity.driverLicense) {
        const driverLicenseEntity = new DriverLicenseEntity();
        driverLicenseEntity.licenseType = driverLicense.licenseType;
        driverLicenseEntity.licenseValidFrom = driverLicense.licenseValidFrom;
        driverLicenseEntity.licenseValidTo = driverLicense.licenseValidTo;
        driverLicenseEntity.restrictions = driverLicense.restrictions;
        driverLicenseEntity.issuingAuthority = driverLicense.issuingAuthority;
        driverLicenseEntity.userId = domainEntity.id;
        persistenceEntity.driverLicense.push(driverLicenseEntity);
      }
    }

    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.previousPassword = domainEntity.previousPassword;
    persistenceEntity.provider = domainEntity.provider;
    persistenceEntity.socialId = domainEntity.socialId;
    persistenceEntity.firstName = domainEntity.firstName;
    persistenceEntity.lastName = domainEntity.lastName;
    persistenceEntity.photo = photo;
    persistenceEntity.role = role;
    persistenceEntity.status = status;
    persistenceEntity.documentId = domainEntity.documentId;
    persistenceEntity.driverLicense = domainEntity.driverLicense;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    return persistenceEntity;
  }
}
