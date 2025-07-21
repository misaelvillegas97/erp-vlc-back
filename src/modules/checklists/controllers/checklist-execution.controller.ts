import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                  from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                               from '@nestjs/swagger';
import { ChecklistExecutionService }                                                  from '../services/checklist-execution.service';
import { CreateChecklistExecutionDto }                                                from '../domain/dto/create-checklist-execution.dto';
import { QueryChecklistExecutionDto }                                                 from '../domain/dto/query-checklist-execution.dto';
import { ChecklistExecutionEntity }                                                   from '../domain/entities/checklist-execution.entity';

@ApiTags('Checklists - Executions')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'checklists/executions',
  version: '1',
})
export class ChecklistExecutionController {
  constructor(private readonly executionService: ChecklistExecutionService) {}

  @ApiOperation({
    summary: 'Execute a checklist',
    description: 'Execute a checklist template or group with answers. Validates required questions, calculates scores, and creates incidents for low performance.'
  })
  @ApiResponse({
    status: 201,
    description: 'Checklist execution completed successfully',
    type: ChecklistExecutionEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors or missing required answers'
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async executeChecklist(@Body() dto: CreateChecklistExecutionDto): Promise<ChecklistExecutionEntity> {
    return this.executionService.executeChecklist(dto);
  }

  @ApiOperation({
    summary: 'Get all checklist executions',
    description: 'Retrieve all checklist executions with filtering and pagination options'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of checklist executions',
    schema: {
      type: 'object',
      properties: {
        total: {type: 'number', example: 100},
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/ChecklistExecutionEntity'}
        }
      }
    }
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryChecklistExecutionDto): Promise<{ total: number; items: ChecklistExecutionEntity[] }> {
    const [ items, total ] = await this.executionService.findAll(query);
    return {total, items};
  }

  @ApiOperation({
    summary: 'Get checklist execution by ID',
    description: 'Retrieve a specific checklist execution with all related data including answers and incident'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the checklist execution data',
    type: ChecklistExecutionEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist execution not found'
  })
  @ApiParam({name: 'id', description: 'Checklist execution ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<ChecklistExecutionEntity> {
    return this.executionService.findById(id);
  }

  @ApiOperation({
    summary: 'Get execution statistics',
    description: 'Get statistics for executions including average scores and completion rates'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns execution statistics',
    schema: {
      type: 'object',
      properties: {
        totalExecutions: {type: 'number', example: 150},
        completedExecutions: {type: 'number', example: 145},
        averageScore: {type: 'number', example: 85.5},
        lowPerformanceCount: {type: 'number', example: 12},
        incidentCount: {type: 'number', example: 8}
      }
    }
  })
  @Get('statistics/summary')
  @HttpCode(HttpStatus.OK)
  getStatistics(): {
    totalExecutions: number;
    completedExecutions: number;
    averageScore: number;
    lowPerformanceCount: number;
    incidentCount: number;
  } {
    // This would be implemented in the service
    // For now, return mock data structure
    return {
      totalExecutions: 0,
      completedExecutions: 0,
      averageScore: 0,
      lowPerformanceCount: 0,
      incidentCount: 0
    };
  }

  @ApiOperation({
    summary: 'Get executions by vehicle',
    description: 'Get all executions for a specific vehicle'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of executions for the vehicle',
    type: [ ChecklistExecutionEntity ]
  })
  @ApiParam({name: 'vehicleId', description: 'Vehicle ID'})
  @Get('vehicle/:vehicleId')
  @HttpCode(HttpStatus.OK)
  async findByVehicle(@Param('vehicleId') vehicleId: string): Promise<ChecklistExecutionEntity[]> {
    const query: QueryChecklistExecutionDto = {targetVehicleId: vehicleId};
    const [ items ] = await this.executionService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get executions by user',
    description: 'Get all executions performed by a specific user'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of executions by the user',
    type: [ ChecklistExecutionEntity ]
  })
  @ApiParam({name: 'userId', description: 'User ID'})
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async findByUser(@Param('userId') userId: string): Promise<ChecklistExecutionEntity[]> {
    const query: QueryChecklistExecutionDto = {executorUserId: userId};
    const [ items ] = await this.executionService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get executions by template',
    description: 'Get all executions for a specific checklist template'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of executions for the template',
    type: [ ChecklistExecutionEntity ]
  })
  @ApiParam({name: 'templateId', description: 'Template ID'})
  @Get('template/:templateId')
  @HttpCode(HttpStatus.OK)
  async findByTemplate(@Param('templateId') templateId: string): Promise<ChecklistExecutionEntity[]> {
    const query: QueryChecklistExecutionDto = {templateId};
    const [ items ] = await this.executionService.findAll(query);
    return items;
  }
}
