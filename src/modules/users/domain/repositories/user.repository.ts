import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';

import { NullableType }               from '@shared/utils/types/nullable.type';
import { IPaginationOptions }         from '@shared/utils/types/pagination-options';
import { FilterUserDto, SortUserDto } from '../../dto/query-user.dto';
import { UserEntity }                 from '../entities/user.entity';
import { UserMapper }                 from '../mappers/user.mapper';
import { User }                       from '../user';
import bcrypt                         from 'bcryptjs';
import { TenantRepository }           from '@shared/repositories/tenant.repository';
import { TenantService }              from '@modules/tenant/services/tenant.service';

export interface FindManyWithPagination {
  filterOptions?: FilterUserDto | null,
  sortOptions?: SortUserDto[] | null,
  paginationOptions: IPaginationOptions
};

@Injectable()
export class UserRepository extends TenantRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepository: Repository<UserEntity>,
    entityManager: EntityManager,
    tenantService: TenantService,
  ) {
    super(UserEntity, entityManager, tenantService);
  }

  async createUser(data: User): Promise<User> {
    const persistenceModel = UserMapper.toPersistence(data);
    const newEntity = await this.save(
      this.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({filterOptions, sortOptions, paginationOptions}: FindManyWithPagination): Promise<User[]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (filterOptions?.roles?.length) {
      where.role = filterOptions.roles.map((role) => ({id: role.id}));
    }

    const entities = await this.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce((accumulator, sort) => ({...accumulator, [sort.orderBy]: sort.order}), {}),
    });

    return entities.map((user) => UserMapper.toDomain(user));
  }

  async findManyByQuery(query: string): Promise<User[]> {
    // find users by query, for example, David Misael Villegas Sandoval matches David Misael in firstName, and Villegas Sandoval in lastname, or david.misa97@gmail.com in email
    const qb = this.createQueryBuilder('user');

    qb.leftJoinAndSelect('user.role', 'role');
    qb.leftJoinAndSelect('user.roles', 'roles');
    qb.leftJoinAndSelect('roles.role', 'rolesUserRole');

    if (query)
      qb.where('user.email ilike :query', {query: `%${ query }%`})
        .orWhere('CONCAT(user.firstName, \' \', user.lastName) ilike :query', {query: `%${ query }%`});

    const entities = await qb.getMany();

    return entities.map((user) => UserMapper.toDomain(user));
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const entity = await this.findOne({where: {id}});

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (!email) return null;

    const entity = await this.findOne({
      where: {email},
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findBySocialIdAndProvider({
                                    socialId,
                                    provider,
                                  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (!socialId || !provider) return null;

    const entity = await this.findOne({
      where: {socialId, provider},
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async updateUser(id: User['id'], payload: Partial<User>): Promise<User> {
    const entity = await this.findOne({
      where: {id},
    });

    if (!entity) {
      throw new Error('User not found');
    }

    const updatedEntity = await this.save(
      this.create(
        UserMapper.toPersistence({
          ...UserMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return UserMapper.toDomain(updatedEntity);
  }

  async updatePassword(id: User['id'], newPassword: string): Promise<User> {
    const entity = await this.findOne({
      where: {id},
    });

    if (!entity) {
      throw new Error('User not found');
    }

    entity.password = await bcrypt.hash(newPassword, 10);

    const updatedEntity = await this.save(entity);

    return UserMapper.toDomain(updatedEntity);
  }

  async removeUser(id: User['id']): Promise<void> {
    await this.delete(id);
  }
}
