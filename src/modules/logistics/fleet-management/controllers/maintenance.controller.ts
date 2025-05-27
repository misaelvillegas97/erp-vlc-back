import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                                      from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags }                                         from '@nestjs/swagger';
import { MaintenanceService }                                                                             from '../services/maintenance.service';
import { MaintenanceRecordMapper }                                                                        from '../domain/mappers/maintenance-record.mapper';
import { MaintenanceAlertMapper }                                                                         from '../domain/mappers/maintenance-alert.mapper';
import { AlertStatus }                                                                                    from '../domain/entities/maintenance-alert.entity';
import { QueryMaintenanceDto }                                                                            from '../domain/dto/query-maintenance.dto';
import { PaginationDto }                                                                                  from '@shared/utils/dto/pagination.dto';
import { MaintenanceRecordEntity }                                                                        from '../domain/entities/maintenance-record.entity';
import { MaintenanceStatisticsDto }                                                                       from '../domain/dto/maintenance-statistics.dto';

@ApiTags('Logistics - Maintenance')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/maintenance',
  version: '1',
})
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // Maintenance Records Endpoints

  @ApiOperation({summary: 'Get all maintenance records with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of maintenance records'})
  @Get('records')
  @HttpCode(HttpStatus.OK)
  async findAllMaintenanceRecords(
    @Query() query: QueryMaintenanceDto
  ): Promise<PaginationDto<MaintenanceRecordEntity>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    return this.maintenanceService.findAllMaintenanceRecords(query, {page, limit});
  }

  @ApiOperation({summary: 'Create a new maintenance record'})
  @ApiResponse({status: 201, description: 'Maintenance record has been created successfully'})
  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  createMaintenanceRecord(@Body() data: any): Promise<MaintenanceRecordMapper> {
    return this.maintenanceService.createMaintenanceRecord(data);
  }

  @ApiOperation({summary: 'Get maintenance history for a vehicle'})
  @ApiResponse({status: 200, description: 'Returns list of maintenance records for the vehicle'})
  @ApiParam({name: 'vehicleId', description: 'Vehicle ID'})
  @Get('records/vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  getVehicleMaintenanceHistory(@Param('vehicleId') vehicleId: string): Promise<MaintenanceRecordMapper[]> {
    return this.maintenanceService.getVehicleMaintenanceHistory(vehicleId);
  }

  @ApiOperation({summary: 'Get a single maintenance record by ID'})
  @ApiResponse({status: 200, description: 'Returns the maintenance record data'})
  @ApiResponse({status: 404, description: 'Maintenance record not found'})
  @ApiParam({name: 'id', description: 'Maintenance Record ID'})
  @Get('records/:id')
  @HttpCode(HttpStatus.OK)
  getMaintenanceRecord(@Param('id') id: string): Promise<MaintenanceRecordMapper> {
    return this.maintenanceService.getMaintenanceRecord(id);
  }

  @ApiOperation({summary: 'Update an existing maintenance record'})
  @ApiResponse({status: 200, description: 'Maintenance record has been updated successfully'})
  @ApiResponse({status: 404, description: 'Maintenance record not found'})
  @ApiParam({name: 'id', description: 'Maintenance Record ID'})
  @Put('records/:id')
  @HttpCode(HttpStatus.OK)
  updateMaintenanceRecord(
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<MaintenanceRecordMapper> {
    return this.maintenanceService.updateMaintenanceRecord(id, data);
  }

  @ApiOperation({summary: 'Delete a maintenance record'})
  @ApiResponse({status: 204, description: 'Maintenance record has been deleted successfully'})
  @ApiResponse({status: 404, description: 'Maintenance record not found'})
  @ApiParam({name: 'id', description: 'Maintenance Record ID'})
  @Delete('records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMaintenanceRecord(@Param('id') id: string): Promise<void> {
    return this.maintenanceService.deleteMaintenanceRecord(id);
  }

  // Maintenance Alerts Endpoints

  @ApiOperation({summary: 'Generate maintenance alerts for all vehicles'})
  @ApiResponse({status: 200, description: 'Maintenance alerts have been generated successfully'})
  @Post('alerts/generate')
  @HttpCode(HttpStatus.OK)
  generateMaintenanceAlerts(): Promise<void> {
    return this.maintenanceService.generateMaintenanceAlerts();
  }

  @ApiOperation({summary: 'Create a new maintenance alert'})
  @ApiResponse({status: 201, description: 'Maintenance alert has been created successfully'})
  @Post('alerts')
  @HttpCode(HttpStatus.CREATED)
  createMaintenanceAlert(@Body() data: any): Promise<MaintenanceAlertMapper> {
    return this.maintenanceService.createMaintenanceAlert(data);
  }

  @ApiOperation({summary: 'Get all active maintenance alerts'})
  @ApiResponse({status: 200, description: 'Returns list of active maintenance alerts'})
  @Get('alerts/active')
  @HttpCode(HttpStatus.OK)
  getActiveAlerts(): Promise<MaintenanceAlertMapper[]> {
    return this.maintenanceService.getActiveAlerts();
  }

  @ApiOperation({summary: 'Get maintenance alerts for a vehicle'})
  @ApiResponse({status: 200, description: 'Returns list of maintenance alerts for the vehicle'})
  @ApiParam({name: 'vehicleId', description: 'Vehicle ID'})
  @Get('alerts/vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  getVehicleAlerts(@Param('vehicleId') vehicleId: string): Promise<MaintenanceAlertMapper[]> {
    return this.maintenanceService.getVehicleAlerts(vehicleId);
  }

  @ApiOperation({summary: 'Get a single maintenance alert by ID'})
  @ApiResponse({status: 200, description: 'Returns the maintenance alert data'})
  @ApiResponse({status: 404, description: 'Maintenance alert not found'})
  @ApiParam({name: 'id', description: 'Maintenance Alert ID'})
  @Get('alerts/:id')
  @HttpCode(HttpStatus.OK)
  getAlert(@Param('id') id: string): Promise<MaintenanceAlertMapper> {
    return this.maintenanceService.getAlert(id);
  }

  @ApiOperation({summary: 'Update maintenance alert status'})
  @ApiResponse({status: 200, description: 'Maintenance alert status has been updated successfully'})
  @ApiResponse({status: 404, description: 'Maintenance alert not found'})
  @ApiParam({name: 'id', description: 'Maintenance Alert ID'})
  @ApiQuery({name: 'status', enum: AlertStatus})
  @Patch('alerts/:id/status')
  @HttpCode(HttpStatus.OK)
  updateAlertStatus(
    @Param('id') id: string,
    @Query('status') status: AlertStatus,
    @Query('maintenanceRecordId') maintenanceRecordId?: string,
  ): Promise<MaintenanceAlertMapper> {
    return this.maintenanceService.updateAlertStatus(id, status, maintenanceRecordId);
  }

  @ApiOperation({summary: 'Delete a maintenance alert'})
  @ApiResponse({status: 204, description: 'Maintenance alert has been deleted successfully'})
  @ApiResponse({status: 404, description: 'Maintenance alert not found'})
  @ApiParam({name: 'id', description: 'Maintenance Alert ID'})
  @Delete('alerts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAlert(@Param('id') id: string): Promise<void> {
    return this.maintenanceService.deleteAlert(id);
  }

  // Maintenance Statistics Endpoint

  @ApiOperation({summary: 'Get maintenance statistics'})
  @ApiResponse({status: 200, description: 'Returns maintenance statistics'})
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  getMaintenanceStatistics(): Promise<MaintenanceStatisticsDto> {
    return this.maintenanceService.getMaintenanceStatistics();
  }
}
