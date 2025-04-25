import { Injectable, Logger, NotFoundException }   from '@nestjs/common';
import { InjectRepository }                        from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { UserEntity }                              from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity }                     from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }                          from '@modules/roles/domain/entities/role-user.entity';
import { RoleEnum }                                from '@modules/roles/roles.enum';
import { QueryDriverDto }                          from '../domain/dto/query-driver.dto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DriverLicenseEntity)
    private readonly driverLicenseRepository: Repository<DriverLicenseEntity>,
    @InjectRepository(RoleUserEntity)
    private readonly roleUserRepository: Repository<RoleUserEntity>
  ) {}

  /**
   * Encuentra todos los usuarios con rol de conductor
   */
  async findAll(query: QueryDriverDto): Promise<[ UserEntity[], number ]> {
    // Primero obtenemos los IDs de usuarios con rol de conductor
    const driverRoleUsers = await this.roleUserRepository.find({
      where: {
        roleId: RoleEnum.driver
      },
      select: [ 'userId' ]
    });

    console.log('Driver Role Users:', driverRoleUsers);

    const driverUserIds = driverRoleUsers.map(ru => ru.userId);
    if (driverUserIds.length === 0) {
      return [ [], 0 ];
    }

    const take = query.limit || 10;
    const skip = ((query.page || 1) - 1) * take;

    const where: FindOptionsWhere<UserEntity> = {
      id: In(driverUserIds)
    };

    // Aplicar filtros adicionales si se proporcionan
    if (query.documentId) {
      where.documentId = query.documentId;
    }

    if (query.licenseType) {
      // Buscar licencias del tipo especificado
      const licenses = await this.driverLicenseRepository.find({
        where: {licenseType: query.licenseType},
        select: [ 'userId' ]
      });
      const licenseUserIds = licenses.map(l => l.userId);
      where.id = In(licenseUserIds.filter(id => driverUserIds.includes(id)));
    }

    if (query.search) {
      const search = `%${ query.search }%`;
      return this.userRepository.findAndCount({
        where: [
          {...where, firstName: ILike(search)},
          {...where, lastName: ILike(search)},
          {...where, documentId: ILike(search)},
        ],
        relations: [ 'driverLicense' ],
        take,
        skip,
        order: {firstName: 'ASC', lastName: 'ASC'}
      });
    }

    return this.userRepository.findAndCount({
      where,
      relations: [ 'driverLicense' ],
      take,
      skip,
      order: {firstName: 'ASC', lastName: 'ASC'}
    });
  }

  /**
   * Encuentra todos los conductores disponibles (con licencia válida)
   */
  async findAllAvailable(): Promise<UserEntity[]> {
    // Primero obtenemos los IDs de usuarios con rol de conductor
    const driverRoleUsers = await this.roleUserRepository.find({
      where: {
        roleId: RoleEnum.driver
      },
      select: [ 'userId' ]
    });

    const driverUserIds = driverRoleUsers.map(ru => ru.userId);
    if (driverUserIds.length === 0) {
      return [];
    }

    // Obtener la fecha actual
    const now = new Date();

    // Buscar licencias válidas
    const validLicenses = await this.driverLicenseRepository.find({
      where: {
        userId: In(driverUserIds),
        licenseValidFrom: In(driverUserIds),
        licenseValidTo: In(driverUserIds) // TypeORM aplicará la condición <= automáticamente
      },
      select: [ 'userId' ]
    });

    const validDriverIds = validLicenses.map(l => l.userId);

    // Devolver usuarios con licencias válidas
    return this.userRepository.find({
      where: {
        id: In(validDriverIds)
      },
      relations: [ 'driverLicense' ],
      order: {firstName: 'ASC', lastName: 'ASC'}
    });
  }

  /**
   * Encuentra un conductor por ID
   */
  async findById(id: string): Promise<UserEntity> {
    // Verificar que exista el usuario
    const user = await this.userRepository.findOne({
      where: {id},
      relations: [ 'driverLicense' ]
    });

    if (!user) {
      throw new NotFoundException(`Driver with ID ${ id } not found`);
    }

    // Verificar que el usuario tenga rol de conductor
    const isDriver = await this.roleUserRepository.findOne({
      where: {
        userId: id,
        roleId: RoleEnum.driver
      }
    });

    if (!isDriver) {
      throw new NotFoundException(`User with ID ${ id } is not a driver`);
    }

    return user;
  }

  /**
   * Verifica si un conductor tiene una licencia válida
   */
  async hasValidLicense(userId: string): Promise<boolean> {
    const now = new Date();

    const driverLicense = await this.driverLicenseRepository.findOne({
      where: {userId}
    });

    if (!driverLicense) {
      return false;
    }

    return driverLicense.licenseValidFrom <= now && driverLicense.licenseValidTo >= now;
  }
}
