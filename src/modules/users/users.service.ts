import { HttpStatus, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';

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
import { DriverLicenseDto }           from '@modules/users/dto/driver-license.dto';
import { DateTime }                   from 'luxon';
import { ExportFormat }               from './dto/export-user.dto';
import * as ExcelJS                   from 'exceljs';
import * as Papa                      from 'papaparse';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

    // Si es conductor, validar que tenga los datos obligatorios
    if (createUserDto.role.id === RoleEnum.driver) {
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
      /*for (const driverLicense of createUserDto.driverLicense) {
        // Verificar que la licencia del conductor no esté vencida
        const licenseValidTo = DateTime.fromISO(driverLicense.licenseValidTo).startOf('day');
        if (licenseValidTo < DateTime.now().startOf('day')) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              licenseValidTo: 'driverLicenseExpired',
            },
          });
        }
      }*/
    }

    const passwordHash = createUserDto.password
      ? await bcrypt.hash(createUserDto.password, 10)
      : undefined;

    const user = {
      ...createUserDto,
      email: createUserDto.email?.toLowerCase(),
      status: {id: createUserDto.status?.id || StatusEnum.active},
      password: passwordHash,
      provider: createUserDto.provider || AuthProvidersEnum.email,
    } as User;

    const createdUser = await this.usersRepository.create(user);

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

    // Si es conductor, validar que tenga los datos obligatorios
    if (updateUserDto.role.id === RoleEnum.driver) {
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
      for (const driverLicense of updateUserDto.driverLicense || []) {
        const licenseValidTo = driverLicense.licenseValidTo;
        if (licenseValidTo < DateTime.now().toISODate()) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              licenseValidTo: 'driverLicenseExpired',
            },
          });
        }
      }
    }

    return this.usersRepository.updateUser(id, {
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

  createDriverLicense(id: string, driverLicenseDto: DriverLicenseDto) {
    if (!driverLicenseDto.licenseValidTo) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {licenseValidTo: 'licenseValidToRequired'},
      });
    }

    if (!driverLicenseDto.licenseType) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {licenseType: 'licenseTypeRequired'},
      });
    }

    return this.driverLicenseRepository.save({
      ...driverLicenseDto,
      user: {id},
    });
  }

  updatePassword(
    id: User['id'],
    newPassword: string,
  ): Promise<User> {
    return this.usersRepository.updatePassword(id, newPassword);
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.removeUser(id);
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

  /**
   * Export users to the specified format
   * @param query Query parameters to filter users
   * @param format Export format (json, csv, excel)
   * @returns Buffer with the exported data
   */
  async exportUsers(query: any, format: ExportFormat): Promise<Buffer> {
    this.logger.log(`Exporting users in ${ format } format`);

    const page = query?.page ?? 1;
    let limit = query?.limit ?? 1000; // Use a higher limit for exports
    if (limit > 5000) limit = 5000;

    const users = await this.findManyWithPagination({
      filterOptions: query?.filters,
      sortOptions: query?.sort,
      paginationOptions: {
        page,
        limit,
      },
    });

    switch (format) {
      case ExportFormat.JSON:
        return this.exportToJson(users);
      case ExportFormat.CSV:
        return this.exportToCsv(users);
      case ExportFormat.EXCEL:
      default:
        return this.exportToExcel(users);
    }
  }

  /**
   * Export users to JSON format
   * @param users List of users to export
   * @returns Buffer with the JSON data
   */
  private exportToJson(users: User[]): Buffer {
    const jsonData = JSON.stringify(users, null, 2);
    return Buffer.from(jsonData);
  }

  /**
   * Export users to CSV format
   * @param users List of users to export
   * @returns Buffer with the CSV data
   */
  private exportToCsv(users: User[]): Buffer {
    const csv = Papa.unparse(users);
    return Buffer.from(csv);
  }

  /**
   * Export users to Excel format
   * @param users List of users to export
   * @returns Buffer with the Excel data
   */
  private async exportToExcel(users: User[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    // Define columns
    worksheet.columns = [
      {header: 'ID', key: 'id', width: 36},
      {header: 'Nombre', key: 'name', width: 20},
      {header: 'Email', key: 'email', width: 25},
      {header: 'Nombre', key: 'firstName', width: 15},
      {header: 'Apellido', key: 'lastName', width: 15},
      {header: 'Documento ID', key: 'documentId', width: 15},
      {header: 'Teléfono', key: 'phoneNumber', width: 15},
      {header: 'Dirección', key: 'address', width: 30},
      {header: 'Contacto de Emergencia', key: 'emergencyContactName', width: 25},
      {header: 'Teléfono de Emergencia', key: 'emergencyContactPhone', width: 25},
      {header: 'Notas', key: 'notes', width: 30},
      {header: 'Fecha de Creación', key: 'createdAt', width: 20},
      {header: 'Fecha de Actualización', key: 'updatedAt', width: 20},
    ];

    // Format headers
    worksheet.getRow(1).font = {bold: true};
    worksheet.getRow(1).alignment = {vertical: 'middle', horizontal: 'center'};

    // Add data
    worksheet.addRows(users);

    const excelBuffer = workbook.xlsx.writeBuffer();

    return Buffer.from(await excelBuffer);
  }
}
