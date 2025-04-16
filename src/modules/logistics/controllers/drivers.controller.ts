import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                               from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                                            from '@nestjs/swagger';
import { DriversService }                                                                          from '../services/drivers.service';
import { CreateDriverDto }                                                                         from '../domain/dto/create-driver.dto';
import { UpdateDriverDto }                                                                         from '../domain/dto/update-driver.dto';
import { QueryDriverDto }                                                                          from '../domain/dto/query-driver.dto';
import { DriverEntity }                                                                            from '../domain/entities/driver.entity';

@ApiTags('Logistics - Drivers')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/drivers',
  version: '1',
})
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @ApiOperation({summary: 'Get all drivers with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of drivers'})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryDriverDto): Promise<{ total: number; items: DriverEntity[] }> {
    const [ items, total ] = await this.driversService.findAll(query);
    return {total, items};
  }

  @ApiOperation({summary: 'Get a single driver by ID'})
  @ApiResponse({status: 200, description: 'Returns the driver data'})
  @ApiResponse({status: 404, description: 'Driver not found'})
  @ApiParam({name: 'id', description: 'Driver ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<DriverEntity> {
    return this.driversService.findById(id);
  }

  @ApiOperation({summary: 'Create a new driver'})
  @ApiResponse({status: 201, description: 'Driver has been created successfully'})
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDriverDto: CreateDriverDto): Promise<DriverEntity> {
    return this.driversService.create(createDriverDto);
  }

  @ApiOperation({summary: 'Update an existing driver'})
  @ApiResponse({status: 200, description: 'Driver has been updated successfully'})
  @ApiResponse({status: 404, description: 'Driver not found'})
  @ApiParam({name: 'id', description: 'Driver ID'})
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ): Promise<DriverEntity> {
    return this.driversService.update(id, updateDriverDto);
  }

  @ApiOperation({summary: 'Delete a driver'})
  @ApiResponse({status: 204, description: 'Driver has been deleted successfully'})
  @ApiResponse({status: 404, description: 'Driver not found'})
  @ApiParam({name: 'id', description: 'Driver ID'})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.driversService.delete(id);
  }
}
