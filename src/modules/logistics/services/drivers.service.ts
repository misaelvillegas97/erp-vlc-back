import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository }                                         from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere }                      from 'typeorm';
import { DriverEntity }                                             from '../domain/entities/driver.entity';
import { CreateDriverDto }                                          from '../domain/dto/create-driver.dto';
import { UpdateDriverDto }                                          from '../domain/dto/update-driver.dto';
import { QueryDriverDto }                                           from '../domain/dto/query-driver.dto';
import { FilesService }                                             from '@modules/files/files.service';
import { plainToInstance }                                          from 'class-transformer';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(DriverEntity)
    private readonly driverRepository: Repository<DriverEntity>,
    private readonly filesService: FilesService
  ) {}

  async findAll(query: QueryDriverDto): Promise<[ DriverEntity[], number ]> {
    const take = query.limit || 10;
    const skip = ((query.page || 1) - 1) * take;

    const where: FindOptionsWhere<DriverEntity> = {};

    if (query.documentId) {
      where.documentId = query.documentId;
    }

    if (query.licenseNumber) {
      where.licenseNumber = query.licenseNumber;
    }

    if (query.licenseType) {
      where.licenseType = query.licenseType;
    }

    if (query.search) {
      const search = `%${ query.search }%`;
      return this.driverRepository.findAndCount({
        where: [
          {firstName: ILike(search)},
          {lastName: ILike(search)},
          {documentId: ILike(search)},
          {licenseNumber: ILike(search)}
        ],
        take,
        skip,
        order: {firstName: 'ASC', lastName: 'ASC'}
      });
    }

    return this.driverRepository.findAndCount({
      where,
      take,
      skip,
      order: {firstName: 'ASC', lastName: 'ASC'}
    });
  }

  async findById(id: string): Promise<DriverEntity> {
    const driver = await this.driverRepository.findOne({where: {id}});
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${ id } not found`);
    }
    return driver;
  }

  async create(createDriverDto: CreateDriverDto): Promise<DriverEntity> {
    // Check if driver with the same document ID already exists
    const existingDriver = await this.driverRepository.findOne({
      where: {documentId: createDriverDto.documentId}
    });

    if (existingDriver) {
      throw new ConflictException(`Driver with document ID ${ createDriverDto.documentId } already exists`);
    }

    const driver = plainToInstance(DriverEntity, createDriverDto);

    // Process photo if provided
    if (createDriverDto.photoId) {
      try {
        const fileInfo = await this.filesService.findById(createDriverDto.photoId);
        if (fileInfo) {
          driver.photo = {id: createDriverDto.photoId, path: fileInfo.path};
        }
      } catch (error) {
        this.logger.error(`Error processing photo: ${ error.message }`);
      }
    }

    return this.driverRepository.save(driver);
  }

  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<DriverEntity> {
    const driver = await this.findById(id);

    // Check if trying to update documentId and if it's already in use
    if (updateDriverDto.documentId && updateDriverDto.documentId !== driver.documentId) {
      const existingDriver = await this.driverRepository.findOne({
        where: {documentId: updateDriverDto.documentId}
      });

      if (existingDriver) {
        throw new ConflictException(`Driver with document ID ${ updateDriverDto.documentId } already exists`);
      }
    }

    // Update the driver with new data
    Object.assign(driver, updateDriverDto);

    // Process photo if provided
    if (updateDriverDto.photoId) {
      try {
        const fileInfo = await this.filesService.findById(updateDriverDto.photoId);
        if (fileInfo) {
          driver.photo = {id: updateDriverDto.photoId, path: fileInfo.path};
        }
      } catch (error) {
        this.logger.error(`Error processing photo: ${ error.message }`);
      }
    }

    return this.driverRepository.save(driver);
  }

  async delete(id: string): Promise<void> {
    const driver = await this.findById(id);
    await this.driverRepository.remove(driver);
  }
}
