import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags }                                  from '@nestjs/swagger';
import { AuthGuard }                                                           from '@nestjs/passport';
import { SuppliersService }                                                    from '@modules/supplier/supplier.service';
import { CreateSupplierDto, FilterSuppliersDto, UpdateSupplierDto }            from '@modules/supplier/domain/supplier.dto';
import { SupplierMapper }                                                      from '@modules/supplier-invoices/domain/mappers/supplier.mapper';

@ApiTags('suppliers')
@UseGuards(AuthGuard('jwt'))
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({summary: 'Crear un nuevo proveedor'})
  @ApiResponse({status: 201, description: 'Proveedor creado exitosamente'})
  @ApiResponse({status: 422, description: 'Datos de proveedor inválidos'})
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    const supplier = await this.suppliersService.create(createSupplierDto);

    return SupplierMapper.toCompleteDto(supplier);
  }

  @Get()
  @ApiOperation({summary: 'Obtener todos los proveedores con filtros opcionales'})
  async findAll(@Query() filterDto: FilterSuppliersDto) {
    const suppliers = await this.suppliersService.findAll(filterDto);

    const [ supplierList, count ] = suppliers;

    return {
      total: count,
      suppliers: SupplierMapper.toSimpleDtoList(supplierList),
    };
  }

  @Get('statistics')
  @ApiOperation({summary: 'Obtener estadísticas de proveedores'})
  getStatistics() {
    return this.suppliersService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({summary: 'Obtener un proveedor por ID'})
  @ApiResponse({status: 200, description: 'Proveedor encontrado'})
  @ApiResponse({status: 404, description: 'Proveedor no encontrado'})
  async findOne(@Param('id') id: string) {
    const supplier = await this.suppliersService.findOne(id);

    return SupplierMapper.toCompleteDto(supplier);
  }

  @Get('rut/:rut')
  @ApiOperation({summary: 'Obtener un proveedor por RUT'})
  @ApiResponse({status: 200, description: 'Proveedor encontrado'})
  @ApiResponse({status: 404, description: 'Proveedor no encontrado'})
  findByRut(@Param('rut') rut: string) {
    return this.suppliersService.findByRut(rut);
  }

  @Patch(':id')
  @ApiOperation({summary: 'Actualizar un proveedor'})
  @ApiResponse({status: 200, description: 'Proveedor actualizado'})
  @ApiResponse({status: 404, description: 'Proveedor no encontrado'})
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({summary: 'Cambiar el estado activo/inactivo de un proveedor'})
  @ApiResponse({status: 200, description: 'Estado del proveedor actualizado'})
  @ApiResponse({status: 404, description: 'Proveedor no encontrado'})
  toggleStatus(@Param('id') id: string) {
    return this.suppliersService.toggleStatus(id);
  }

  @Delete(':id')
  @ApiOperation({summary: 'Eliminar un proveedor'})
  @ApiResponse({status: 200, description: 'Proveedor eliminado'})
  @ApiResponse({status: 404, description: 'Proveedor no encontrado'})
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
