import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService }                                                    from '../services/inventory.service';
import { InventoryItemEntity }                                                 from '../domain/entities/inventory-item.entity';
import { InventoryMovementEntity }                                             from '../domain/entities/inventory-movement.entity';
import { InventoryBatchEntity }                                                from '../domain/entities/inventory-batch.entity';
import { AuthGuard }                                                           from '@nestjs/passport';
import { RolesGuard }                                                          from '@modules/roles/roles.guard';
import { Roles }                                                               from '@modules/roles/roles.decorator';
import { RoleEnum }                                                            from '@modules/roles/roles.enum';
import { CurrentUser }                                                         from '@shared/decorators/current-user.decorator';
import { RoleDto }                                                             from '@modules/roles/dto/role.dto';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService
  ) {}

  @Get()
  findAll(@Query() query: any): Promise<InventoryItemEntity[]> {
    return this.inventoryService.findAll(query);
  }

  @Get('item/:id')
  findOne(@Param('id') id: string): Promise<InventoryItemEntity> {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  create(@Body() createInventoryItemDto: any): Promise<InventoryItemEntity> {
    return this.inventoryService.create(createInventoryItemDto);
  }

  @Patch('item/:id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  update(@Param('id') id: string, @Body() updateInventoryItemDto: any): Promise<InventoryItemEntity> {
    return this.inventoryService.update(id, updateInventoryItemDto);
  }

  @Delete('item/:id')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  remove(@Param('id') id: string): Promise<void> {
    return this.inventoryService.delete(id);
  }

  @Post('item/:id/add-stock')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  addStock(
    @Param('id') id: string,
    @Body() addStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity> {
    return this.inventoryService.addStock(
      id,
      addStockDto.quantity,
      addStockDto.reference,
      addStockDto.metadata,
      user.id,
      addStockDto.batchNumber,
      addStockDto.expirationDate
    );
  }

  @Post('item/:id/remove-stock')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  removeStock(
    @Param('id') id: string,
    @Body() removeStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity> {
    return this.inventoryService.removeStock(
      id,
      removeStockDto.quantity,
      removeStockDto.reference,
      removeStockDto.metadata,
      user.id
    );
  }

  @Post('item/:id/adjust-stock')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager)
  adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity> {
    // If batch information is provided, include it in metadata
    const metadata = adjustStockDto.metadata || {};
    if (adjustStockDto.batchNumber) {
      metadata.batchNumber = adjustStockDto.batchNumber;
    }
    if (adjustStockDto.expirationDate) {
      metadata.expirationDate = adjustStockDto.expirationDate;
    }

    return this.inventoryService.adjustStock(
      id,
      adjustStockDto.newQuantity,
      adjustStockDto.reference,
      metadata,
      user.id
    );
  }

  @Post('transfer')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager, RoleEnum.warehouse_staff)
  transferStock(
    @Body() transferStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity[]> {
    return this.inventoryService.transferStock(
      transferStockDto.fromItemId,
      transferStockDto.toItemId,
      transferStockDto.quantity,
      transferStockDto.reference,
      transferStockDto.metadata,
      user.id
    );
  }

  @Get('product/:productId')
  getStockByProduct(@Param('productId') productId: string): Promise<InventoryItemEntity[]> {
    return this.inventoryService.getStockByProduct(productId);
  }

  @Get('product-info/:nameOrUpc')
  getStockByProductInfo(@Param('nameOrUpc') nameOrUpc: string): Promise<InventoryItemEntity[]> {
    return this.inventoryService.getStockByProductInfo(nameOrUpc);
  }

  @Get('warehouse/:warehouseId')
  getStockByWarehouse(@Param('warehouseId') warehouseId: string): Promise<InventoryItemEntity[]> {
    return this.inventoryService.getStockByWarehouse(warehouseId);
  }

  @Get('low-stock')
  getLowStockItems(): Promise<InventoryItemEntity[]> {
    return this.inventoryService.getLowStockItems();
  }

  @Get('expiring')
  getExpiringItems(@Query('days') days: number = 30): Promise<InventoryItemEntity[]> {
    return this.inventoryService.getExpiringItems(days);
  }

  @Get('item/:id/batches')
  getBatchesByItemId(@Param('id') id: string): Promise<InventoryBatchEntity[]> {
    return this.inventoryService.getBatchesByItemId(id);
  }

  @Get('batches')
  getAllBatches(
    @Query('warehouseId') warehouseId?: string,
    @Query('expiringBefore') expiringBefore?: string,
    @Query('isReserved') isReserved?: string,
    @Query('batchNumber') batchNumber?: string
  ): Promise<InventoryBatchEntity[]> {
    const options: any = {};

    if (warehouseId) options.warehouseId = warehouseId;
    if (batchNumber) options.batchNumber = batchNumber;

    if (expiringBefore) {
      options.expiringBefore = new Date(expiringBefore);
    }

    if (isReserved !== undefined) {
      options.isReserved = isReserved === 'true';
    }

    return this.inventoryService.getAllBatches(options);
  }

  @Post('item/:id/reserve')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager) // , 'sales_staff'
  reserveStock(
    @Param('id') id: string,
    @Body() reserveStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity> {
    return this.inventoryService.reserveStock(
      id,
      reserveStockDto.quantity,
      reserveStockDto.reference,
      user.id
    );
  }

  @Post('item/:id/release')
  @Roles(RoleEnum.admin, RoleEnum.inventory_manager) // , 'sales_staff'
  releaseReservedStock(
    @Param('id') id: string,
    @Body() releaseStockDto: any,
    @CurrentUser() user: { id: string, role: RoleDto }
  ): Promise<InventoryMovementEntity> {
    return this.inventoryService.releaseReservedStock(
      id,
      releaseStockDto.quantity,
      releaseStockDto.reference,
      user.id
    );
  }
}
