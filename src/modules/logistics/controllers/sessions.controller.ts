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
import { SessionMapper }                                                              from '@modules/logistics/domain/mappers/session.mapper';

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
  async findAll(@Query() query: QuerySessionDto): Promise<{ total: number; items: VehicleSessionEntity[] }> {
    const [ items, total ] = await this.sessionsService.findAll(query);
    return {total, items};
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
  async findHistory(@Query() query: QuerySessionDto): Promise<{ total: number; items: SessionMapper[] }> {
    // Set status filter to exclude active sessions for history
    const historyQuery = {
      ...query,
      status: undefined // Will be handled in the service
    };
    const [ items, total ] = await this.sessionsService.findAll(historyQuery);
    return {total, items: SessionMapper.toDomainAll(items)};
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
  ): Promise<VehicleSessionEntity> {
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
}
