import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                            from '@nestjs/typeorm';
import { ILike, Repository }                                           from 'typeorm';
import { SupplierEntity }                                              from '@modules/supplier/domain/entities/supplier.entity';
import { CreateSupplierDto, FilterSuppliersDto, UpdateSupplierDto }    from '@modules/supplier/domain/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity) private suppliersRepository: Repository<SupplierEntity>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<SupplierEntity> {
    // Validar si ya existe un proveedor con el mismo RUT
    const existingSupplier = await this.suppliersRepository.findOne({
      where: {rut: createSupplierDto.rut},
    });

    if (existingSupplier) {
      throw new UnprocessableEntityException({code: 'SUPPLIER_RUT_EXISTS'});
    }

    const supplier = this.suppliersRepository.create(createSupplierDto);
    return this.suppliersRepository.save(supplier);
  }

  async findAll(filterDto: FilterSuppliersDto): Promise<[ SupplierEntity[], number ]> {
    const {search, type, taxCategory, isActive, tag} = filterDto;

    const queryBuilder = this.suppliersRepository.createQueryBuilder('supplier');

    if (search) {
      queryBuilder.where([
        {businessName: ILike(`%${ search }%`)},
        {fantasyName: ILike(`%${ search }%`)},
        {rut: ILike(`%${ search }%`)},
      ]);
    }

    if (type) {
      queryBuilder.andWhere('supplier.type = :type', {type});
    }

    if (taxCategory) {
      queryBuilder.andWhere('supplier.taxCategory = :taxCategory', {taxCategory});
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('supplier.isActive = :isActive', {isActive});
    }

    if (tag) {
      queryBuilder.andWhere('supplier.tags LIKE :tag', {tag: `%${ tag }%`});
    }

    return queryBuilder.getManyAndCount();
  }

  async findOne(id: string): Promise<SupplierEntity> {
    const supplier = await this.suppliersRepository.findOne({
      where: {id},
    });

    if (!supplier) {
      throw new NotFoundException({code: 'SUPPLIER_NOT_FOUND'});
    }

    return supplier;
  }

  async findByRut(rut: string): Promise<SupplierEntity> {
    const supplier = await this.suppliersRepository.findOne({
      where: {rut},
    });

    if (!supplier) {
      throw new NotFoundException({code: 'SUPPLIER_NOT_FOUND'});
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<SupplierEntity> {
    const supplier = await this.findOne(id);

    const updated = this.suppliersRepository.merge(supplier, updateSupplierDto);
    return this.suppliersRepository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.softRemove(supplier);
  }

  async toggleStatus(id: string): Promise<SupplierEntity> {
    const supplier = await this.findOne(id);
    supplier.isActive = !supplier.isActive;
    return this.suppliersRepository.save(supplier);
  }

  async getStatistics() {
    // Total de proveedores
    const totalSuppliers = await this.suppliersRepository.count();

    // Proveedores por tipo
    const suppliersByType = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .select('supplier.type', 'type')
      .addSelect('COUNT(supplier.id)', 'count')
      .groupBy('supplier.type')
      .getRawMany();

    // Proveedores por categoría tributaria
    const suppliersByTaxCategory = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .select('supplier.taxCategory', 'taxCategory')
      .addSelect('COUNT(supplier.id)', 'count')
      .groupBy('supplier.taxCategory')
      .getRawMany();

    // Proveedores activos vs inactivos
    const suppliersByStatus = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .select('supplier.isActive', 'isActive')
      .addSelect('COUNT(supplier.id)', 'count')
      .groupBy('supplier.isActive')
      .getRawMany();

    return {
      totalSuppliers,
      suppliersByType,
      suppliersByTaxCategory,
      suppliersByStatus
    };
  }
}
