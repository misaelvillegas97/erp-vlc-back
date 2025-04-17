import { HttpStatus, Injectable, UnprocessableEntityException } from '@nestjs/common';

import bcrypt from 'bcryptjs';

import { AuthProvidersEnum }          from '@core/auth/auth-providers.enum';
import { UserRepository }             from '@modules/users/domain/repositories/user.repository';
import { IPaginationOptions }         from '@shared/utils/types/pagination-options';
import { NullableType }               from '@shared/utils/types/nullable.type';
import { DeepPartial }                from '@shared/utils/types/deep-partial.type';
import { CreateUserDto }              from './dto/create-user.dto';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { User }                       from './domain/user';
import { FilesService }               from '../files/files.service';
import { RoleEnum }                   from '../roles/roles.enum';
import { StatusEnum }                 from '../statuses/domain/enum/statuses.enum';
import { InjectRepository }           from '@nestjs/typeorm';
import { DriverLicenseEntity }        from './domain/entities/driver-license.entity';
import { Repository }                 from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
    @InjectRepository(DriverLicenseEntity)
    private readonly driverLicenseRepository: Repository<DriverLicenseEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    if (createUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(createUserDto.email);

      if (userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
    }

    let hasDriverRole = false;

    // Verificar si se está asignando el rol de conductor
    if (createUserDto.role && createUserDto.role.id === RoleEnum.driver) {
      hasDriverRole = true;
    }

    // Si es conductor, validar que tenga los datos obligatorios
    if (hasDriverRole || createUserDto.isDriver) {
      if (!createUserDto.documentId) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            documentId: 'documentIdRequired',
          },
        });
      }

      if (!createUserDto.driverLicense) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            driverLicense: 'driverLicenseRequired',
          },
        });
      }

      // Verificar que la licencia del conductor no esté vencida
      const licenseValidTo = new Date(createUserDto.driverLicense.licenseValidTo);
      if (licenseValidTo < new Date()) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            licenseValidTo: 'driverLicenseExpired',
          },
        });
      }
    }

    const passwordHash = createUserDto.password
      ? await bcrypt.hash(createUserDto.password, 10)
      : undefined;

    const createdUser = await this.usersRepository.create({
      ...createUserDto,
      email: createUserDto.email?.toLowerCase(),
      role: {
        id: createUserDto.role?.id || RoleEnum.user,
      },
      status: {
        id: createUserDto.status?.id || StatusEnum.active,
      },
      password: passwordHash,
      provider: createUserDto.provider || AuthProvidersEnum.email,
    } as User);

    return createdUser;
  }

  async update(
    id: User['id'],
    updateUserDto: DeepPartial<CreateUserDto>,
  ): Promise<User> {
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    let hasDriverRole = false;

    // Verificar si se está asignando el rol de conductor
    if (updateUserDto.role && updateUserDto.role.id === RoleEnum.driver) {
      hasDriverRole = true;
    }

    // Si es conductor, validar que tenga los datos obligatorios
    if (hasDriverRole || updateUserDto.isDriver) {
      if (!updateUserDto.documentId && !existingUser.documentId) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            documentId: 'documentIdRequired',
          },
        });
      }

      // Si no se proporciona información de licencia en la actualización y el usuario
      // no tenía licencia previamente, se requiere esta información
      if (!updateUserDto.driverLicense && !existingUser.driverLicense) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            driverLicense: 'driverLicenseRequired',
          },
        });
      }

      // Verificar que la licencia del conductor no esté vencida (si se proporciona)
      if (updateUserDto.driverLicense?.licenseValidTo) {
        const licenseValidTo = updateUserDto.driverLicense.licenseValidTo;
        if (licenseValidTo < new Date()) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              licenseValidTo: 'driverLicenseExpired',
            },
          });
        }
      }
    }

    return this.usersRepository.update(id, {
      ...updateUserDto,
      email: updateUserDto.email?.toLowerCase(),
      password: updateUserDto.password
        ? await bcrypt.hash(updateUserDto.password, 10)
        : undefined,
    } as User);
  }

  findManyWithPagination({
                           filterOptions,
                           sortOptions,
                           paginationOptions,
                         }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findByQuery(query: string): Promise<User[]> {
    return this.usersRepository.findManyByQuery(query);
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.usersRepository.findById(id);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  findBySocialIdAndProvider({
                              socialId,
                              provider,
                            }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.usersRepository.findBySocialIdAndProvider({socialId, provider});
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async validateEmail(email: string, userId?: string): Promise<void> {
    const userObject = await this.usersRepository.findByEmail(email);
    if (userObject && userObject.id !== userId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {email: 'emailAlreadyExists'},
      });
    }
  }

  private async validateFile(photoId: string): Promise<void> {
    const fileObject = await this.filesService.findById(photoId);
    if (!fileObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {photo: 'imageNotExists'},
      });
    }
  }

  private validateEnumValue(value: string, enumType: object, errorKey: string): void {
    if (!Object.values(enumType).map(String).includes(value)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {[errorKey]: `${ errorKey }NotExists`},
      });
    }
  }
}
