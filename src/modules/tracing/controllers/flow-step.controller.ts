import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, }                      from '@nestjs/swagger';
import { AuthGuard }                                                                         from '@nestjs/passport';
import { FlowStepService }                                                                   from '../services/flow-step.service';
import { CreateFlowStepDto }                                                                 from '../domain/dto/create-flow-step.dto';
import { UpdateFlowStepDto }                                                                 from '../domain/dto/update-flow-step.dto';
import { FlowStepResponseDto }                                                               from '../domain/dto/flow-step-response.dto';

/**
 * Controller for flow step operations
 * Handles CRUD operations for steps within flow versions
 */
@ApiTags('Flow Steps')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/steps')
export class FlowStepController {
  constructor(private readonly flowStepService: FlowStepService) {}

  /**
   * Create a new flow step
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new flow step',
    description: 'Creates a new step within a flow version',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Flow step created successfully',
    type: FlowStepResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or version is not DRAFT',
  })
  async createFlowStep(
    @Body() createDto: CreateFlowStepDto,
  ): Promise<FlowStepResponseDto> {
    return this.flowStepService.createFlowStep(createDto);
  }

  /**
   * Get all steps for a flow version
   */
  @Get('version/:versionId')
  @ApiOperation({
    summary: 'Get all steps for a flow version',
    description: 'Retrieves all steps for a specific flow version',
  })
  @ApiParam({
    name: 'versionId',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow steps retrieved successfully',
    type: [ FlowStepResponseDto ],
  })
  async findStepsByVersion(
    @Param('versionId') versionId: string,
  ): Promise<FlowStepResponseDto[]> {
    return this.flowStepService.findStepsByVersion(versionId);
  }

  /**
   * Get a flow step by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get flow step by ID',
    description: 'Retrieves a specific flow step by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow step ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow step retrieved successfully',
    type: FlowStepResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow step not found',
  })
  async findStepById(
    @Param('id') id: string,
  ): Promise<FlowStepResponseDto> {
    return this.flowStepService.findStepById(id);
  }

  /**
   * Update a flow step
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update flow step',
    description: 'Updates a flow step (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow step ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow step updated successfully',
    type: FlowStepResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow step not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT or invalid input',
  })
  async updateFlowStep(
    @Param('id') id: string,
    @Body() updateDto: UpdateFlowStepDto,
  ): Promise<FlowStepResponseDto> {
    return this.flowStepService.updateFlowStep(id, updateDto);
  }

  /**
   * Delete a flow step
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete flow step',
    description: 'Deletes a flow step (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow step ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Flow step deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow step not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT',
  })
  async deleteFlowStep(@Param('id') id: string): Promise<void> {
    return this.flowStepService.deleteFlowStep(id);
  }

  /**
   * Reorder steps within a version
   */
  @Post('version/:versionId/reorder')
  @ApiOperation({
    summary: 'Reorder steps within a version',
    description: 'Updates the order of steps within a flow version',
  })
  @ApiParam({
    name: 'versionId',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Steps reordered successfully',
    type: [ FlowStepResponseDto ],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT or invalid order',
  })
  async reorderSteps(
    @Param('versionId') versionId: string,
    @Body() reorderData: { stepIds: string[] },
  ): Promise<FlowStepResponseDto[]> {
    return this.flowStepService.reorderSteps(versionId, reorderData.stepIds);
  }
}
