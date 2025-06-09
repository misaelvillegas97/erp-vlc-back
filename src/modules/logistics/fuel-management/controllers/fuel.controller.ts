import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                                    from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags }                                       from '@nestjs/swagger';
import { FuelService }                                                                                  from '../services/fuel.service';
import { CreateFuelRecordDto }                                                                          from '../domain/dto/create-fuel-record.dto';
import { UpdateFuelRecordDto }                                                                          from '../domain/dto/update-fuel-record.dto';
import { QueryFuelRecordDto }                                                                           from '../domain/dto/query-fuel-record.dto';
import { FuelRecordMapper }                                                                             from '../domain/mappers/fuel-record.mapper';
import { FuelConsumptionSummaryMapper }                                                                 from '../domain/mappers/fuel-consumption-summary.mapper';
import { FuelConsumptionByPeriodMapper }                                                                from '../domain/mappers/fuel-consumption-by-period.mapper';
import { Request }                                                                                      from 'express';

@ApiTags('Logistics - Fuel Management')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/fuel',
  version: '1',
})
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @ApiOperation({summary: 'Get all fuel records with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of fuel records'})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryFuelRecordDto): Promise<{ total: number; items: FuelRecordMapper[] }> {
    const [ items, total ] = await this.fuelService.findAll(query);
    return {total, items};
  }

  @ApiOperation({summary: 'Get a single fuel record by ID'})
  @ApiResponse({status: 200, description: 'Returns the fuel record data'})
  @ApiResponse({status: 404, description: 'Fuel record not found'})
  @ApiParam({name: 'id', description: 'Fuel record ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<FuelRecordMapper> {
    return this.fuelService.findById(id);
  }

  @ApiOperation({summary: 'Get fuel records by vehicle ID'})
  @ApiResponse({status: 200, description: 'Returns fuel records for the specified vehicle'})
  @ApiParam({name: 'vehicleId', description: 'Vehicle ID'})
  @Get('vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  findByVehicle(@Param('vehicleId') vehicleId: string): Promise<FuelRecordMapper[]> {
    return this.fuelService.findByVehicleId(vehicleId);
  }

  @ApiOperation({summary: 'Create a new fuel record'})
  @ApiResponse({status: 201, description: 'Fuel record has been created successfully'})
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() createFuelRecordDto: CreateFuelRecordDto): Promise<FuelRecordMapper> {
    // Extract user ID from JWT token
    const userId = req.user['id'];
    return this.fuelService.create(userId, createFuelRecordDto);
  }

  @ApiOperation({summary: 'Update an existing fuel record'})
  @ApiResponse({status: 200, description: 'Fuel record has been updated successfully'})
  @ApiResponse({status: 404, description: 'Fuel record not found'})
  @ApiParam({name: 'id', description: 'Fuel record ID'})
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateFuelRecordDto: UpdateFuelRecordDto,
  ): Promise<FuelRecordMapper> {
    return this.fuelService.update(id, updateFuelRecordDto);
  }

  @ApiOperation({summary: 'Delete a fuel record'})
  @ApiResponse({status: 204, description: 'Fuel record has been deleted successfully'})
  @ApiResponse({status: 404, description: 'Fuel record not found'})
  @ApiParam({name: 'id', description: 'Fuel record ID'})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.fuelService.delete(id);
  }

  @ApiOperation({summary: 'Get fuel consumption summary'})
  @ApiResponse({status: 200, description: 'Returns fuel consumption summary'})
  @ApiQuery({name: 'vehicleId', required: false, description: 'Filter by vehicle ID'})
  @ApiQuery({name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)'})
  @ApiQuery({name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)'})
  @Get('analysis/summary')
  @HttpCode(HttpStatus.OK)
  async getSummary(
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FuelConsumptionSummaryMapper[]> {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.fuelService.getFuelConsumptionSummary(vehicleId, startDateObj, endDateObj);
  }

  @ApiOperation({summary: 'Get fuel consumption by period'})
  @ApiResponse({status: 200, description: 'Returns fuel consumption by period'})
  @ApiQuery({name: 'vehicleId', required: false, description: 'Filter by vehicle ID'})
  @ApiQuery({name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)'})
  @ApiQuery({name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)'})
  @Get('analysis/period')
  @HttpCode(HttpStatus.OK)
  async getByPeriod(
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FuelConsumptionByPeriodMapper[]> {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.fuelService.getFuelConsumptionByPeriod(vehicleId, startDateObj, endDateObj);
  }
}
