import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                                      from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                                                   from '@nestjs/swagger';
import {
  ChecklistTemplateService,
  QueryChecklistTemplateDto
}                                                                                                         from '../services/checklist-template.service';
import { CreateChecklistTemplateDto }                                                                     from '../domain/dto/create-checklist-template.dto';
import { ChecklistTemplateEntity }                                                                        from '../domain/entities/checklist-template.entity';

@ApiTags('Checklists - Templates')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'checklists/templates'
})
export class ChecklistTemplateController {
  constructor(private readonly templateService: ChecklistTemplateService) {}

  @ApiOperation({
    summary: 'Create a new checklist template',
    description: 'Create a new checklist template with specified type, filters, and performance threshold'
  })
  @ApiResponse({
    status: 201,
    description: 'Checklist template created successfully',
    type: ChecklistTemplateEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors'
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateChecklistTemplateDto): Promise<ChecklistTemplateEntity> {
    return this.templateService.createTemplate(dto);
  }

  @ApiOperation({
    summary: 'Get all checklist templates',
    description: 'Retrieve all checklist templates with filtering and pagination options'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of checklist templates',
    schema: {
      type: 'object',
      properties: {
        total: {type: 'number', example: 50},
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/ChecklistTemplateEntity'}
        }
      }
    }
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryChecklistTemplateDto): Promise<{ total: number; items: ChecklistTemplateEntity[] }> {
    const [ items, total ] = await this.templateService.findAll(query);
    return {total, items};
  }

  @ApiOperation({
    summary: 'Get checklist template by ID',
    description: 'Retrieve a specific checklist template with all categories and questions'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the checklist template data',
    type: ChecklistTemplateEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist template not found'
  })
  @ApiParam({name: 'id', description: 'Checklist template ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<ChecklistTemplateEntity> {
    return this.templateService.findById(id);
  }

  @ApiOperation({
    summary: 'Update checklist template',
    description: 'Update an existing checklist template'
  })
  @ApiResponse({
    status: 200,
    description: 'Checklist template updated successfully',
    type: ChecklistTemplateEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist template not found'
  })
  @ApiParam({name: 'id', description: 'Checklist template ID'})
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateChecklistTemplateDto>
  ): Promise<ChecklistTemplateEntity> {
    return await this.templateService.updateTemplate(id, dto);
  }

  @ApiOperation({
    summary: 'Delete checklist template',
    description: 'Soft delete a checklist template. Cannot delete templates that have been executed.'
  })
  @ApiResponse({
    status: 204,
    description: 'Checklist template deleted successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist template not found'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete template that has been executed'
  })
  @ApiParam({name: 'id', description: 'Checklist template ID'})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.templateService.delete(id);
  }

  @ApiOperation({
    summary: 'Duplicate checklist template',
    description: 'Create a copy of an existing checklist template with all its categories and questions'
  })
  @ApiResponse({
    status: 201,
    description: 'Checklist template duplicated successfully',
    type: ChecklistTemplateEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Original checklist template not found'
  })
  @ApiParam({name: 'id', description: 'Original checklist template ID'})
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(
    @Param('id') id: string,
    @Body() body?: { name?: string }
  ): Promise<ChecklistTemplateEntity> {
    return this.templateService.duplicate(id, body?.name);
  }

  @ApiOperation({
    summary: 'Toggle template active status',
    description: 'Activate or deactivate a checklist template'
  })
  @ApiResponse({
    status: 200,
    description: 'Template status updated successfully',
    type: ChecklistTemplateEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist template not found'
  })
  @ApiParam({name: 'id', description: 'Checklist template ID'})
  @Patch(':id/toggle-active')
  @HttpCode(HttpStatus.OK)
  async toggleActive(@Param('id') id: string): Promise<ChecklistTemplateEntity> {
    return this.templateService.toggleActive(id);
  }

  @ApiOperation({
    summary: 'Get template statistics',
    description: 'Get statistics for a checklist template including execution data'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns template statistics',
    schema: {
      type: 'object',
      properties: {
        totalCategories: {type: 'number', example: 5},
        totalQuestions: {type: 'number', example: 25},
        requiredQuestions: {type: 'number', example: 15},
        executionCount: {type: 'number', example: 100},
        averageScore: {type: 'number', example: 87.5}
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist template not found'
  })
  @ApiParam({name: 'id', description: 'Checklist template ID'})
  @Get(':id/statistics')
  @HttpCode(HttpStatus.OK)
  async getStatistics(@Param('id') id: string): Promise<{
    totalCategories: number;
    totalQuestions: number;
    requiredQuestions: number;
    executionCount: number;
    averageScore: number;
  }> {
    return this.templateService.getStatistics(id);
  }

  @ApiOperation({
    summary: 'Find templates by filters',
    description: 'Find active templates that match vehicle type and user role filters'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered list of templates',
    type: [ ChecklistTemplateEntity ]
  })
  @Get('filter/by-criteria')
  @HttpCode(HttpStatus.OK)
  async findByFilters(
    @Query('vehicleType') vehicleType?: string,
    @Query('userRole') userRole?: string
  ): Promise<ChecklistTemplateEntity[]> {
    return this.templateService.findByFilters(vehicleType, userRole);
  }

  @ApiOperation({
    summary: 'Admin test endpoint',
    description: 'Smoke test endpoint for checklist templates'
  })
  @ApiResponse({
    status: 200,
    description: 'Test successful',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string', example: 'Checklist templates module is working'},
        timestamp: {type: 'string', example: '2025-07-17T23:30:00Z'}
      }
    }
  })
  @Get('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string; timestamp: string } {
    return {
      message: 'Checklist templates module is working',
      timestamp: new Date().toISOString()
    };
  }
}
