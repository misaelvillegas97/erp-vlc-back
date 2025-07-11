import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                  from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags }                     from '@nestjs/swagger';
import { SessionsService }                                                            from '../services/sessions.service';
import { StartSessionDto }                                                            from '../domain/dto/start-session.dto';
import { FinishSessionDto }                                                           from '../domain/dto/finish-session.dto';
import { UpdateLocationDto }                                                          from '../domain/dto/update-location.dto';
import { QuerySessionDto }                                                            from '../domain/dto/query-session.dto';
import { VehicleSessionEntity }                                                       from '../domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity }                                               from '../domain/entities/vehicle-session-location.entity';
import { SessionMapper }                                                              from '@modules/logistics/fleet-management/domain/mappers/session.mapper';
import { PaginationDto }                                                              from '@shared/utils/dto/pagination.dto';
import { CurrentUser }                                                                from '@shared/decorators/current-user.decorator';
import { RoleEnum }                                                                   from '@modules/roles/roles.enum';
import { VehicleMapper }                                                              from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';

@ApiTags('Logistics - Vehicle Sessions')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'logistics/sessions',
  version: '1',
})
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({summary: 'Get all vehicle sessions with filtering options'})
  @ApiResponse({status: 200, description: 'Returns list of vehicle sessions'})
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QuerySessionDto, @CurrentUser() user: any): Promise<PaginationDto<VehicleSessionEntity>> {
    if (user.role.id !== RoleEnum.admin && user.role.id !== RoleEnum.dispatcher) query.driverId = user.id;

    return this.sessionsService.findAll(query);
  }

  @ApiOperation({summary: 'Get all active vehicle sessions'})
  @ApiResponse({status: 200, description: 'Returns list of active vehicle sessions'})
  @ApiQuery({name: 'includeDetails', type: Boolean, required: false})
  @Get('active')
  @HttpCode(HttpStatus.OK)
  findActive(@Query('includeDetails') includeDetails: boolean = false): Promise<VehicleSessionEntity[]> {
    return this.sessionsService.findAllActive(includeDetails);
  }

  @ApiOperation({summary: 'Get active vehicle sessions with additional details'})
  @ApiResponse({status: 200, description: 'Returns list of active vehicle sessions with details'})
  @Get('active/details')
  @HttpCode(HttpStatus.OK)
  findActiveWithDetails(): Promise<VehicleSessionEntity[]> {
    return this.sessionsService.findAllActive(true);
  }

  @ApiOperation({summary: 'Get vehicle session history'})
  @ApiResponse({status: 200, description: 'Returns list of historical vehicle sessions'})
  @Get('history')
  @HttpCode(HttpStatus.OK)
  async findHistory(@Query() query: QuerySessionDto, @CurrentUser() user: any): Promise<PaginationDto<SessionMapper>> {
    // Set status filter to exclude active sessions for history
    const historyQuery: QuerySessionDto = {
      ...query,
      driverId: user.role.id !== RoleEnum.admin && user.role.id !== RoleEnum.dispatcher ? user.id : undefined,
      status: undefined // Will be handled in the service
    };
    const result = await this.sessionsService.findAll(historyQuery);
    return {
      ...result,
      items: SessionMapper.toDomainAll(result.items)
    };
  }

  @ApiOperation({summary: 'Get a single vehicle session by ID'})
  @ApiResponse({status: 200, description: 'Returns the vehicle session data'})
  @ApiResponse({status: 404, description: 'Vehicle session not found'})
  @ApiParam({name: 'id', description: 'Session ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string): Promise<VehicleSessionEntity> {
    return this.sessionsService.findById(id);
  }

  @ApiOperation({summary: 'Get sessions by vehicle ID'})
  @ApiResponse({status: 200, description: 'Returns vehicle sessions for the specified vehicle'})
  @ApiParam({name: 'vehicleId', description: 'Vehicle ID'})
  @Get('vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  findByVehicle(@Param('vehicleId') vehicleId: string): Promise<VehicleSessionEntity[]> {
    return this.sessionsService.findByVehicleId(vehicleId);
  }

  @ApiOperation({summary: 'Get sessions by driver ID'})
  @ApiResponse({status: 200, description: 'Returns vehicle sessions for the specified driver'})
  @ApiParam({name: 'driverId', description: 'Driver ID'})
  @Get('driver/:driverId')
  @HttpCode(HttpStatus.OK)
  findByDriver(@Param('driverId') driverId: string): Promise<VehicleSessionEntity[]> {
    return this.sessionsService.findByDriverId(driverId);
  }

  @ApiOperation({summary: 'Start a new vehicle session'})
  @ApiResponse({status: 201, description: 'Vehicle session has been started successfully'})
  @Post()
  @HttpCode(HttpStatus.CREATED)
  startSession(@Body() startSessionDto: StartSessionDto): Promise<VehicleSessionEntity> {
    return this.sessionsService.startSession(startSessionDto);
  }

  @ApiOperation({summary: 'Finish an existing vehicle session'})
  @ApiResponse({status: 200, description: 'Vehicle session has been finished successfully'})
  @ApiResponse({status: 404, description: 'Vehicle session not found'})
  @ApiParam({name: 'id', description: 'Session ID'})
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finishSession(
    @Param('id') id: string,
    @Body() finishSessionDto: FinishSessionDto,
    @CurrentUser() user: any,
  ): Promise<VehicleSessionEntity> {
    if (user.role.id !== RoleEnum.admin && user.role.id !== RoleEnum.dispatcher) {
      finishSessionDto.driverId = user.id; // Set driver ID if not admin or dispatcher
    }

    return this.sessionsService.finishSession(id, finishSessionDto);
  }

  @ApiOperation({summary: 'Cancel an existing vehicle session'})
  @ApiResponse({status: 200, description: 'Vehicle session has been cancelled successfully'})
  @ApiResponse({status: 404, description: 'Vehicle session not found'})
  @ApiParam({name: 'id', description: 'Session ID'})
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSession(@Param('id') id: string): Promise<VehicleSessionEntity> {
    return this.sessionsService.cancelSession(id);
  }

  @ApiOperation({summary: 'Update location of an active vehicle session'})
  @ApiResponse({status: 200, description: 'Location has been updated successfully'})
  @ApiResponse({status: 404, description: 'Vehicle session not found'})
  @ApiParam({name: 'id', description: 'Session ID'})
  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<VehicleSessionLocationEntity> {
    return this.sessionsService.updateLocation(id, updateLocationDto);
  }

  @ApiOperation({summary: 'Get latest vehicles used by the current user in sessions'})
  @ApiResponse({status: 200, description: 'Returns list of vehicles used by the current user'})
  @Get('user/latest-vehicles')
  @HttpCode(HttpStatus.OK)
  async findLatestVehiclesByUser(@CurrentUser() user: any): Promise<Partial<VehicleMapper>[]> {
    const vehicles = await this.sessionsService.findLatestVehiclesByDriverId(user.id);

    return vehicles.map(vehicle => VehicleMapper.toLightDomain(vehicle));
  }
}
