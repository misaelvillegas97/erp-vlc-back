import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                                      from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags }                                         from '@nestjs/swagger';
import { VehiclesService }                                                                                from '../services/vehicles.service';
import { CreateVehicleDto }                                                                               from '../domain/dto/create-vehicle.dto';
import { UpdateVehicleDto }                                                                               from '../domain/dto/update-vehicle.dto';
import { QueryVehicleDto }                                                                                from '../domain/dto/query-vehicle.dto';
import {
  VehicleEntity,
  VehicleStatus
}                                                                                                         from '../domain/entities/vehicle.entity';

@ApiTags('Logistics - Vehicles')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/vehicles',
  version: '1',
})
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({summary: 'Get all vehicles with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of vehicles'})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryVehicleDto): Promise<{ total: number; items: VehicleEntity[] }> {
    const [ items, total ] = await this.vehiclesService.findAll(query);
    return {total, items};
  }

  @ApiOperation({summary: 'Get all available vehicles'})
  @ApiResponse({status: 200, description: 'Returns list of available vehicles'})
  @Get('available')
  @HttpCode(HttpStatus.OK)
  findAvailable(): Promise<VehicleEntity[]> {
    return this.vehiclesService.findAllAvailable();
  }

  @ApiOperation({summary: 'Get a single vehicle by ID'})
  @ApiResponse({status: 200, description: 'Returns the vehicle data'})
  @ApiResponse({status: 404, description: 'Vehicle not found'})
  @ApiParam({name: 'id', description: 'Vehicle ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<VehicleEntity> {
    return this.vehiclesService.findById(id);
  }

  @ApiOperation({summary: 'Create a new vehicle'})
  @ApiResponse({status: 201, description: 'Vehicle has been created successfully'})
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    return this.vehiclesService.create(createVehicleDto);
  }

  @ApiOperation({summary: 'Update an existing vehicle'})
  @ApiResponse({status: 200, description: 'Vehicle has been updated successfully'})
  @ApiResponse({status: 404, description: 'Vehicle not found'})
  @ApiParam({name: 'id', description: 'Vehicle ID'})
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleEntity> {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @ApiOperation({summary: 'Update vehicle status'})
  @ApiResponse({status: 200, description: 'Vehicle status has been updated successfully'})
  @ApiResponse({status: 404, description: 'Vehicle not found'})
  @ApiParam({name: 'id', description: 'Vehicle ID'})
  @ApiQuery({name: 'status', enum: VehicleStatus})
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Query('status') status: VehicleStatus,
  ): Promise<VehicleEntity> {
    return this.vehiclesService.updateStatus(id, status);
  }

  @ApiOperation({summary: 'Update vehicle odometer'})
  @ApiResponse({status: 200, description: 'Vehicle odometer has been updated successfully'})
  @ApiResponse({status: 404, description: 'Vehicle not found'})
  @ApiParam({name: 'id', description: 'Vehicle ID'})
  @ApiQuery({name: 'odometer', type: Number})
  @Patch(':id/odometer')
  @HttpCode(HttpStatus.OK)
  updateOdometer(
    @Param('id') id: string,
    @Query('odometer') odometer: number,
  ): Promise<VehicleEntity> {
    return this.vehiclesService.updateOdometer(id, odometer);
  }

  @ApiOperation({summary: 'Delete a vehicle'})
  @ApiResponse({status: 204, description: 'Vehicle has been deleted successfully'})
  @ApiResponse({status: 404, description: 'Vehicle not found'})
  @ApiParam({name: 'id', description: 'Vehicle ID'})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.vehiclesService.delete(id);
  }
}
