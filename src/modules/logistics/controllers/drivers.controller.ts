import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                      from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                   from '@nestjs/swagger';
import { DriversService }                                                 from '../services/drivers.service';
import { QueryDriverDto }                                                 from '../domain/dto/query-driver.dto';
import { UserEntity }                                                     from '@modules/users/domain/entities/user.entity';

@ApiTags('Logistics - Drivers')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/drivers',
  version: '1',
})
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @ApiOperation({summary: 'Get all drivers (users with driver role) with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of drivers'})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryDriverDto): Promise<{ total: number; items: UserEntity[] }> {
    const [ items, total ] = await this.driversService.findAll(query);
    return {total, items};
  }

  @ApiOperation({summary: 'Get all available drivers with valid licenses'})
  @ApiResponse({status: 200, description: 'Returns list of available drivers'})
  @Get('available')
  @HttpCode(HttpStatus.OK)
  findAvailable(): Promise<UserEntity[]> {
    return this.driversService.findAllAvailable();
  }

  @ApiOperation({summary: 'Get a single driver by ID'})
  @ApiResponse({status: 200, description: 'Returns the driver data'})
  @ApiResponse({status: 404, description: 'Driver not found'})
  @ApiParam({name: 'id', description: 'Driver ID (User ID)'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.driversService.findById(id);
  }

  @ApiOperation({summary: 'Validate if a driver has a valid license'})
  @ApiResponse({status: 200, description: 'Returns license validation status'})
  @ApiResponse({status: 404, description: 'Driver not found'})
  @ApiParam({name: 'id', description: 'Driver ID (User ID)'})
  @Get(':id/validate-license')
  @HttpCode(HttpStatus.OK)
  validateLicense(@Param('id') id: string): Promise<{ isValid: boolean }> {
    return this.driversService.hasValidLicense(id).then(isValid => ({isValid}));
  }

  // Nota: Las operaciones de creación, actualización y eliminación de conductores 
  // ahora se manejan a través del controlador de usuarios con el rol adecuado
}
