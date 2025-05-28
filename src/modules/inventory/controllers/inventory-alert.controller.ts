import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryAlertService }                                               from '../services/inventory-alert.service';
import { InventoryAlertEntity }                                                from '../domain/entities/inventory-alert.entity';
import { AuthGuard }                                                           from '@nestjs/passport';
import { RolesGuard }                                                          from '@modules/roles/roles.guard';
import { Roles }                                                               from '@modules/roles/roles.decorator';
import { RoleEnum }                                                            from '@modules/roles/roles.enum';

@Controller('inventory-alerts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryAlertController {
  constructor(
    private readonly inventoryAlertService: InventoryAlertService
  ) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  findAll(@Query() query: any): Promise<InventoryAlertEntity[]> {
    return this.inventoryAlertService.findAll(query);
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  findOne(@Param('id') id: string): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.findOne(id);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  create(@Body() createAlertDto: any): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.create(createAlertDto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  update(@Param('id') id: string, @Body() updateAlertDto: any): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.update(id, updateAlertDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  remove(@Param('id') id: string): Promise<void> {
    return this.inventoryAlertService.delete(id);
  }

  @Post(':id/acknowledge')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  acknowledgeAlert(@Param('id') id: string): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.acknowledgeAlert(id);
  }

  @Post(':id/resolve')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  resolveAlert(@Param('id') id: string): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.resolveAlert(id);
  }

  @Post(':id/dismiss')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  dismissAlert(@Param('id') id: string): Promise<InventoryAlertEntity> {
    return this.inventoryAlertService.dismissAlert(id);
  }
}
