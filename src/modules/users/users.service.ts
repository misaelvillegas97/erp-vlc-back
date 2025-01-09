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

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(createProfileDto: CreateUserDto): Promise<User> {
    const clonedPayload = {provider: AuthProvidersEnum.email, ...createProfileDto};

    if (clonedPayload.password) {
      clonedPayload.password = await this.hashPassword(clonedPayload.password);
    }

    if (clonedPayload.email) {
      await this.validateEmail(clonedPayload.email);
    }

    if (clonedPayload.photo?.id) {
      await this.validateFile(clonedPayload.photo.id);
      clonedPayload.photo = await this.filesService.findById(clonedPayload.photo.id);
    }

    if (clonedPayload.role?.id) {
      this.validateEnumValue(String(clonedPayload.role.id), RoleEnum, 'role');
    }

    if (clonedPayload.status?.id) {
      this.validateEnumValue(String(clonedPayload.status.id), StatusEnum, 'status');
    }

    return this.usersRepository.create(clonedPayload as User);
  }

  async update(id: User['id'], payload: DeepPartial<User>): Promise<User | null> {
    const clonedPayload = {...payload};

    if (clonedPayload.password && clonedPayload.previousPassword !== clonedPayload.password) {
      clonedPayload.password = await this.hashPassword(clonedPayload.password);
    }

    if (clonedPayload.email) {
      await this.validateEmail(clonedPayload.email, id);
    }

    return this.usersRepository.update(id, clonedPayload as User);
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
