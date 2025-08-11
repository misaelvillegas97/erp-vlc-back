import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, }           from '@nestjs/swagger';
import { AuthGuard }                                                                        from '@nestjs/passport';
import { FlowExecutionService }                                                             from '../services/flow-execution.service';
import { CreateFlowInstanceDto }                                                            from '../domain/dto/execution/create-flow-instance.dto';
import { FlowInstanceResponseDto }                                                          from '../domain/dto/execution/flow-instance-response.dto';

/**
 * Controller for flow execution operations
 * Handles starting, monitoring, and cancelling flow instances
 */
@ApiTags('Flow Execution')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/execution')
export class FlowExecutionController {
  constructor(private readonly flowExecutionService: FlowExecutionService) {}

  /**
   * Start a new flow instance
   */
  @Post('instances')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new flow instance',
    description: 'Creates and starts a new flow instance for execution',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Flow instance started successfully',
    type: FlowInstanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template or version not published',
  })
  startFlowInstance(
    @Body() createDto: CreateFlowInstanceDto,
  ): Promise<FlowInstanceResponseDto> {
    return this.flowExecutionService.startFlowInstance(createDto);
  }

  /**
   * Get all flow instances with optional filters
   */
  @Get('instances')
  @ApiOperation({
    summary: 'Get flow instances',
    description: 'Retrieves flow instances with optional filtering',
  })
  @ApiQuery({
    name: 'templateId',
    required: false,
    description: 'Filter by template ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [ 'ACTIVE', 'CANCELLED', 'FINISHED' ],
    description: 'Filter by instance status',
  })
  @ApiQuery({
    name: 'startedBy',
    required: false,
    description: 'Filter by user who started the instance',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow instances retrieved successfully',
    type: [ FlowInstanceResponseDto ],
  })
  findFlowInstances(
    @Query('templateId') templateId?: string,
    @Query('status') status?: string,
    @Query('startedBy') startedBy?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    instances: FlowInstanceResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filters = {templateId, status, startedBy};
    const pagination = {page: page || 1, limit: limit || 20};
    return this.flowExecutionService.findFlowInstances(filters, pagination);
  }

  /**
   * Get a flow instance by ID
   */
  @Get('instances/:id')
  @ApiOperation({
    summary: 'Get flow instance by ID',
    description: 'Retrieves a specific flow instance with detailed information',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow instance ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow instance retrieved successfully',
    type: FlowInstanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow instance not found',
  })
  findFlowInstanceById(
    @Param('id') id: string,
  ): Promise<FlowInstanceResponseDto> {
    return this.flowExecutionService.findFlowInstanceById(id);
  }

  /**
   * Cancel a flow instance
   */
  @Put('instances/:id/cancel')
  @ApiOperation({
    summary: 'Cancel flow instance',
    description: 'Cancels an active flow instance',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow instance ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow instance cancelled successfully',
    type: FlowInstanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow instance not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Flow instance cannot be cancelled',
  })
  cancelFlowInstance(
    @Param('id') id: string,
    @Body() cancelData: {
      cancelledBy: string;
      reason: string;
    },
  ): Promise<FlowInstanceResponseDto> {
    return this.flowExecutionService.cancelFlowInstance(
      id,
      cancelData.cancelledBy,
      cancelData.reason
    );
  }

  /**
   * Get flow instance progress
   */
  @Get('instances/:id/progress')
  @ApiOperation({
    summary: 'Get flow instance progress',
    description: 'Retrieves detailed progress information for a flow instance',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow instance ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        instanceId: {type: 'string'},
        overallProgress: {type: 'number'},
        currentStep: {type: 'object'},
        completedSteps: {type: 'array'},
        pendingSteps: {type: 'array'},
        estimatedCompletion: {type: 'string'}
      }
    }
  })
  getFlowInstanceProgress(
    @Param('id') id: string,
  ): Promise<{
    instanceId: string;
    overallProgress: number;
    currentStep: any;
    completedSteps: any[];
    pendingSteps: any[];
    estimatedCompletion?: string;
  }> {
    return this.flowExecutionService.getFlowInstanceProgress(id);
  }

  /**
   * Resume a paused flow instance
   */
  @Put('instances/:id/resume')
  @ApiOperation({
    summary: 'Resume flow instance',
    description: 'Resumes a paused or interrupted flow instance',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow instance ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow instance resumed successfully',
    type: FlowInstanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow instance not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Flow instance cannot be resumed',
  })
  resumeFlowInstance(
    @Param('id') id: string,
    @Body() resumeData: {
      resumedBy: string;
      notes?: string;
    },
  ): Promise<FlowInstanceResponseDto> {
    return this.flowExecutionService.resumeFlowInstance(
      id,
      resumeData.resumedBy,
      resumeData.notes
    );
  }

  /**
   * Get flow instance history
   */
  @Get('instances/:id/history')
  @ApiOperation({
    summary: 'Get flow instance history',
    description: 'Retrieves the complete execution history of a flow instance',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow instance ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Instance history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        instanceId: {type: 'string'},
        events: {type: 'array'},
        timeline: {type: 'array'},
        statistics: {type: 'object'}
      }
    }
  })
  getFlowInstanceHistory(
    @Param('id') id: string,
  ): Promise<{
    instanceId: string;
    events: any[];
    timeline: any[];
    statistics: any;
  }> {
    return this.flowExecutionService.getFlowInstanceHistory(id);
  }
}
