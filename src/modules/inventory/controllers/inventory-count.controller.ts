import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InventoryCountService }                                        from '../services/inventory-count.service';
import { InventoryCountEntity }                                         from '../domain/entities/inventory-count.entity';
import { InventoryCountItemEntity }                                     from '../domain/entities/inventory-count-item.entity';
import { InventoryMovementEntity }                                      from '../domain/entities/inventory-movement.entity';
import { UserEntity }                                                   from '@modules/users/domain/entities/user.entity';
import { RolesGuard }                                                   from '@modules/roles/roles.guard';
import { AuthGuard }                                                    from '@nestjs/passport';
import { Roles }                                                        from '@modules/roles/roles.decorator';
import { RoleEnum }                                                     from '@modules/roles/roles.enum';
import { CurrentUser }                                                  from '@shared/decorators/current-user.decorator';

@Controller('inventory-counts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryCountController {
  constructor(
    private readonly inventoryCountService: InventoryCountService
  ) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  findAll(): Promise<InventoryCountEntity[]> {
    return this.inventoryCountService.findAll();
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  findOne(@Param('id') id: string): Promise<InventoryCountEntity> {
    return this.inventoryCountService.findOne(id);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  create(@Body() createCountDto: any): Promise<InventoryCountEntity> {
    return this.inventoryCountService.create(createCountDto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  update(@Param('id') id: string, @Body() updateCountDto: any): Promise<InventoryCountEntity> {
    return this.inventoryCountService.update(id, updateCountDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  remove(@Param('id') id: string): Promise<void> {
    return this.inventoryCountService.delete(id);
  }

  @Post(':id/start')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  startCount(@Param('id') id: string): Promise<InventoryCountEntity> {
    return this.inventoryCountService.startCount(id);
  }

  @Post(':id/complete')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  completeCount(@Param('id') id: string): Promise<InventoryCountEntity> {
    return this.inventoryCountService.completeCount(id);
  }

  @Post(':id/cancel')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  cancelCount(@Param('id') id: string): Promise<InventoryCountEntity> {
    return this.inventoryCountService.cancelCount(id);
  }

  @Post(':id/items')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  addCountItem(
    @Param('id') id: string,
    @Body() addItemDto: any
  ): Promise<InventoryCountItemEntity> {
    return this.inventoryCountService.addCountItem(id, addItemDto);
  }

  @Patch('items/:itemId')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  updateCountItem(
    @Param('itemId') itemId: string,
    @Body() updateItemDto: any
  ): Promise<InventoryCountItemEntity> {
    return this.inventoryCountService.updateCountItem(itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  removeCountItem(@Param('itemId') itemId: string): Promise<void> {
    return this.inventoryCountService.deleteCountItem(itemId);
  }

  @Post(':id/process')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  processCountResults(@Param('id') id: string): Promise<void> {
    return this.inventoryCountService.processCountResults(id);
  }

  @Post(':id/apply-adjustments')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  applyCountAdjustments(
    @Param('id') id: string,
    @CurrentUser() user: { id: string, role: UserEntity['role'] }
  ): Promise<InventoryMovementEntity[]> {
    return this.inventoryCountService.applyCountAdjustments(id, user.id);
  }
}
