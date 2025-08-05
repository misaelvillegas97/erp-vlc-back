import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                       from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                                    from '@nestjs/swagger';
import { Response }                                                                        from 'express';
import { ChecklistExecutionService }                                                       from '../services/checklist-execution.service';
import { ChecklistExportService }                                                          from '../services/checklist-export.service';
import { CreateChecklistExecutionDto }                                                     from '../domain/dto/create-checklist-execution.dto';
import { QueryChecklistExecutionDto }                                                      from '../domain/dto/query-checklist-execution.dto';
import { ChecklistExecutionEntity }                                                        from '../domain/entities/checklist-execution.entity';
import { TargetType }                                                                      from '../domain/enums/target-type.enum';
import { ExecutionReportDto }                                                              from '../domain/dto/execution-report.dto';
import { CurrentUser }                                                                     from '@shared/decorators/current-user.decorator';
import { UserRequest }                                                                     from '@modules/users/domain/models/user-request';

@ApiTags('Checklists - Executions')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'checklists/executions',
})
export class ChecklistExecutionController {
  constructor(
    private readonly executionService: ChecklistExecutionService,
    private readonly exportService: ChecklistExportService
  ) {}

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
  async executeChecklist(@Body() dto: CreateChecklistExecutionDto, @CurrentUser() user: UserRequest): Promise<ChecklistExecutionEntity> {
    return this.executionService.executeChecklist(dto, user);
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
    summary: 'Get detailed execution report',
    description: 'Get a detailed hierarchical report of a checklist execution with evaluation → category → question → answer structure, ordered for frontend rendering'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed execution report with hierarchical structure',
    type: ExecutionReportDto
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist execution not found'
  })
  @ApiParam({name: 'id', description: 'Checklist execution ID'})
  @Get(':id/report')
  @HttpCode(HttpStatus.OK)
  async getExecutionReport(@Param('id') id: string): Promise<ExecutionReportDto> {
    return this.executionService.getExecutionReport(id);
  }

  @ApiOperation({
    summary: 'Export execution report as PDF',
    description: 'Export a detailed checklist execution report as a professionally formatted PDF document'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns PDF file for download',
    headers: {
      'Content-Type': {
        description: 'application/pdf',
        schema: {type: 'string'}
      },
      'Content-Disposition': {
        description: 'attachment; filename="execution-report-{id}.pdf"',
        schema: {type: 'string'}
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist execution not found'
  })
  @ApiParam({name: 'id', description: 'Checklist execution ID'})
  @Get(':id/export/pdf')
  @HttpCode(HttpStatus.OK)
  async exportToPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const pdfBuffer = await this.exportService.exportToPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="execution-report-${ id }.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  }

  @ApiOperation({
    summary: 'Export execution report as Excel',
    description: 'Export a detailed checklist execution report as a formatted Excel spreadsheet'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Excel file for download',
    headers: {
      'Content-Type': {
        description: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        schema: {type: 'string'}
      },
      'Content-Disposition': {
        description: 'attachment; filename="execution-report-{id}.xlsx"',
        schema: {type: 'string'}
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist execution not found'
  })
  @ApiParam({name: 'id', description: 'Checklist execution ID'})
  @Get(':id/export/excel')
  @HttpCode(HttpStatus.OK)
  async exportToExcel(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const excelBuffer = await this.exportService.exportToExcel(id);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="execution-report-${ id }.xlsx"`,
      'Content-Length': excelBuffer.length.toString(),
    });

    res.send(excelBuffer);
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
    summary: 'Get executions by target',
    description: 'Get all executions for a specific target (user, vehicle, warehouse, etc.)'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of executions for the target',
    type: [ ChecklistExecutionEntity ]
  })
  @ApiParam({name: 'targetType', description: 'Target type (USER, VEHICLE, WAREHOUSE)'})
  @ApiParam({name: 'targetId', description: 'Target ID'})
  @Get('target/:targetType/:targetId')
  @HttpCode(HttpStatus.OK)
  async findByTarget(@Param('targetType') targetType: TargetType, @Param('targetId') targetId: string): Promise<ChecklistExecutionEntity[]> {
    const query: QueryChecklistExecutionDto = {targetType, targetId};
    const [ items ] = await this.executionService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get executions by executor user',
    description: 'Get all executions performed by a specific executor user. To find executions where a user is being evaluated, use /target/USER/:userId instead.'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of executions performed by the executor user',
    type: [ ChecklistExecutionEntity ]
  })
  @ApiParam({name: 'userId', description: 'Executor User ID'})
  @Get('executor/:userId')
  @HttpCode(HttpStatus.OK)
  async findByExecutor(@Param('userId') userId: string): Promise<ChecklistExecutionEntity[]> {
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
