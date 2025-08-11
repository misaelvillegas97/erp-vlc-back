import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, }           from '@nestjs/swagger';
import { AuthGuard }                                                                        from '@nestjs/passport';
import { StepExecutionService }                                                             from '../services/step-execution.service';
import { CompleteStepDto }                                                                  from '../domain/dto/execution/complete-step.dto';
import { StepExecutionResponseDto }                                                         from '../domain/dto/execution/step-execution-response.dto';

/**
 * Controller for step execution operations
 * Handles individual step management within flow instances
 */
@ApiTags('Step Execution')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/execution/steps')
export class StepExecutionController {
  constructor(private readonly stepExecutionService: StepExecutionService) {}

  /**
   * Start a step execution
   */
  @Post(':instanceId/:stepId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start step execution',
    description: 'Starts the execution of a specific step within a flow instance',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID to start',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step execution started successfully',
    type: StepExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Step cannot be started or is already in progress',
  })
  startStepExecution(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() startData: {
      actorId: string;
      notes?: string;
    },
  ): Promise<StepExecutionResponseDto> {
    return this.stepExecutionService.startStepExecution(
      instanceId,
      stepId,
      startData.actorId,
      startData.notes
    );
  }

  /**
   * Complete a step execution
   */
  @Post(':instanceId/:stepId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete step execution',
    description: 'Completes a step execution with field values, waste records, and order links',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID to complete',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step execution completed successfully',
    type: StepExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Step cannot be completed or validation failed',
  })
  completeStepExecution(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() completeDto: CompleteStepDto,
  ): Promise<StepExecutionResponseDto> {
    return this.stepExecutionService.completeStepExecution(
      instanceId,
      stepId,
      completeDto
    );
  }

  /**
   * Get step execution by ID
   */
  @Get(':executionId')
  @ApiOperation({
    summary: 'Get step execution by ID',
    description: 'Retrieves detailed information about a step execution',
  })
  @ApiParam({
    name: 'executionId',
    description: 'Step execution ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step execution retrieved successfully',
    type: StepExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Step execution not found',
  })
  findStepExecutionById(
    @Param('executionId') executionId: string,
  ): Promise<StepExecutionResponseDto> {
    return this.stepExecutionService.findStepExecutionById(executionId);
  }

  /**
   * Get all step executions for an instance
   */
  @Get('instance/:instanceId')
  @ApiOperation({
    summary: 'Get step executions for instance',
    description: 'Retrieves all step executions for a flow instance',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [ 'PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED' ],
    description: 'Filter by execution status',
  })
  @ApiQuery({
    name: 'actorId',
    required: false,
    description: 'Filter by actor who executed the step',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step executions retrieved successfully',
    type: [ StepExecutionResponseDto ],
  })
  findStepExecutionsByInstance(
    @Param('instanceId') instanceId: string,
    @Query('status') status?: string,
    @Query('actorId') actorId?: string,
  ): Promise<StepExecutionResponseDto[]> {
    const filters = {status, actorId};
    return this.stepExecutionService.findStepExecutionsByInstance(instanceId, filters);
  }

  /**
   * Skip a step execution
   */
  @Put(':instanceId/:stepId/skip')
  @ApiOperation({
    summary: 'Skip step execution',
    description: 'Skips a step execution with a reason',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step execution skipped successfully',
    type: StepExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Step cannot be skipped',
  })
  skipStepExecution(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() skipData: {
      actorId: string;
      reason: string;
      notes?: string;
    },
  ): Promise<StepExecutionResponseDto> {
    return this.stepExecutionService.skipStepExecution(
      instanceId,
      stepId,
      skipData.actorId,
      skipData.reason,
      skipData.notes
    );
  }

  /**
   * Restart a step execution
   */
  @Put(':instanceId/:stepId/restart')
  @ApiOperation({
    summary: 'Restart step execution',
    description: 'Restarts a completed or failed step execution',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID to restart',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step execution restarted successfully',
    type: StepExecutionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Step cannot be restarted',
  })
  restartStepExecution(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() restartData: {
      actorId: string;
      reason: string;
      notes?: string;
    },
  ): Promise<StepExecutionResponseDto> {
    return this.stepExecutionService.restartStepExecution(
      instanceId,
      stepId,
      restartData.actorId,
      restartData.reason,
      restartData.notes
    );
  }

  /**
   * Get step execution form data
   */
  @Get(':instanceId/:stepId/form')
  @ApiOperation({
    summary: 'Get step execution form data',
    description: 'Retrieves the form structure and current values for a step',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step form data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stepId: {type: 'string'},
        stepName: {type: 'string'},
        categories: {type: 'array'},
        fields: {type: 'array'},
        currentValues: {type: 'object'},
        validationRules: {type: 'object'}
      }
    }
  })
  getStepFormData(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
  ): Promise<{
    stepId: string;
    stepName: string;
    categories: any[];
    fields: any[];
    currentValues: Record<string, any>;
    validationRules: Record<string, any>;
  }> {
    return this.stepExecutionService.getStepFormData(instanceId, stepId);
  }

  /**
   * Validate step execution data
   */
  @Post(':instanceId/:stepId/validate')
  @ApiOperation({
    summary: 'Validate step execution data',
    description: 'Validates field values and other data before completing a step',
  })
  @ApiParam({
    name: 'instanceId',
    description: 'Flow instance ID',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Step ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed',
    schema: {
      type: 'object',
      properties: {
        valid: {type: 'boolean'},
        errors: {type: 'array'},
        warnings: {type: 'array'},
        fieldValidation: {type: 'object'}
      }
    }
  })
  validateStepData(
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Body() validationData: CompleteStepDto,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    fieldValidation: Record<string, any>;
  }> {
    return this.stepExecutionService.validateStepData(instanceId, stepId, validationData);
  }
}
