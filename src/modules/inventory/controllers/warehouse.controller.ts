import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WarehouseService }                                                    from '../services/warehouse.service';
import { WarehouseEntity }                                                     from '../domain/entities/warehouse.entity';
import { WarehouseZoneEntity }                                                 from '../domain/entities/warehouse-zone.entity';
import { RolesGuard }                                                          from '@modules/roles/roles.guard';
import { AuthGuard }                                                           from '@nestjs/passport';
import { Roles }                                                               from '@modules/roles/roles.decorator';
import { RoleEnum }                                                            from '@modules/roles/roles.enum';
import { CreateWarehouseDto }                                                  from '@modules/inventory/domain/dto/create-warehouse.dto';
import { QueryWarehouseDto }                                                   from '@modules/inventory/domain/dto/query-warehouse.dto';
import { PaginationDto }                                                       from '@shared/utils/dto/pagination.dto';

@Controller('warehouses')
@UseGuards(AuthGuard('jwt'))
export class WarehouseController {
  constructor(
    private readonly warehouseService: WarehouseService
  ) {}

  @Get()
  findAll(@Query() query: QueryWarehouseDto): Promise<PaginationDto<WarehouseEntity>> {
    return this.warehouseService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<WarehouseEntity> {
    return this.warehouseService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  create(@Body() createWarehouseDto: CreateWarehouseDto): Promise<WarehouseEntity> {
    return this.warehouseService.create(createWarehouseDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  update(@Param('id') id: string, @Body() updateWarehouseDto: any): Promise<WarehouseEntity> {
    return this.warehouseService.update(id, updateWarehouseDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  remove(@Param('id') id: string): Promise<void> {
    return this.warehouseService.delete(id);
  }

  @Get(':warehouseId/zones')
  findAllZones(@Param('warehouseId') warehouseId: string): Promise<WarehouseZoneEntity[]> {
    return this.warehouseService.findAllZones(warehouseId);
  }

  @Get('zones/:id')
  findOneZone(@Param('id') id: string): Promise<WarehouseZoneEntity> {
    return this.warehouseService.findOneZone(id);
  }

  @Post(':warehouseId/zones')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  createZone(
    @Param('warehouseId') warehouseId: string,
    @Body() createZoneDto: any
  ): Promise<WarehouseZoneEntity> {
    const zoneData = {
      ...createZoneDto,
      warehouseId
    };
    return this.warehouseService.createZone(zoneData);
  }

  @Patch('zones/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  updateZone(@Param('id') id: string, @Body() updateZoneDto: any): Promise<WarehouseZoneEntity> {
    return this.warehouseService.updateZone(id, updateZoneDto);
  }

  @Delete('zones/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  removeZone(@Param('id') id: string): Promise<void> {
    return this.warehouseService.deleteZone(id);
  }
}
