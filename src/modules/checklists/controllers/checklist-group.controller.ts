import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard }                                                                               from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiResponse, ApiTags }                                            from '@nestjs/swagger';
import { ChecklistGroupService }                                                                   from '../services/checklist-group.service';
import { CreateChecklistGroupDto }                                                                 from '../domain/dto/create-checklist-group.dto';
import { UpdateChecklistGroupDto }                                                                 from '../domain/dto/update-checklist-group.dto';
import { QueryChecklistGroupDto }                                                                  from '../domain/dto/query-checklist-group.dto';
import { ChecklistGroupEntity }                                                                    from '../domain/entities/checklist-group.entity';

@ApiTags('Checklists - Groups')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'checklists/groups'
})
export class ChecklistGroupController {
  constructor(private readonly groupService: ChecklistGroupService) {}

  @ApiOperation({
    summary: 'Create a new checklist group',
    description: 'Create a new checklist group with templates and weight distribution. Validates that template weights sum to 1.0.'
  })
  @ApiResponse({
    status: 201,
    description: 'Checklist group created successfully',
    type: ChecklistGroupEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors or invalid template weights'
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() dto: CreateChecklistGroupDto): Promise<ChecklistGroupEntity> {
    return this.groupService.createGroup(dto);
  }

  @ApiOperation({
    summary: 'Get all checklist groups',
    description: 'Retrieve all checklist groups with filtering, pagination, and optional relations'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of checklist groups',
    schema: {
      type: 'object',
      properties: {
        total: {type: 'number', example: 50},
        items: {
          type: 'array',
          items: {$ref: '#/components/schemas/ChecklistGroupEntity'}
        }
      }
    }
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAllGroups(@Query() query: QueryChecklistGroupDto): Promise<{ total: number; items: ChecklistGroupEntity[] }> {
    const [ items, total ] = await this.groupService.findAll(query);
    return {total, items};
  }

  @ApiOperation({
    summary: 'Get checklist group by ID',
    description: 'Retrieve a specific checklist group with all related data including templates and categories'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the checklist group data',
    type: ChecklistGroupEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist group not found'
  })
  @ApiParam({name: 'id', description: 'Checklist group ID'})
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findGroupById(@Param('id') id: string): Promise<ChecklistGroupEntity> {
    return this.groupService.findById(id);
  }

  @ApiOperation({
    summary: 'Update checklist group',
    description: 'Update an existing checklist group. Validates template weights if provided.'
  })
  @ApiResponse({
    status: 200,
    description: 'Checklist group updated successfully',
    type: ChecklistGroupEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors or invalid template weights'
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist group not found'
  })
  @ApiParam({name: 'id', description: 'Checklist group ID'})
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistGroupDto
  ): Promise<ChecklistGroupEntity> {
    return this.groupService.updateGroup(id, dto);
  }

  @ApiOperation({
    summary: 'Delete checklist group',
    description: 'Permanently delete a checklist group. Cannot delete groups with existing executions.'
  })
  @ApiResponse({
    status: 204,
    description: 'Checklist group deleted successfully'
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - group has existing executions'
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist group not found'
  })
  @ApiParam({name: 'id', description: 'Checklist group ID'})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string): Promise<void> {
    return this.groupService.deleteGroup(id);
  }

  @ApiOperation({
    summary: 'Deactivate checklist group',
    description: 'Soft delete a checklist group by setting it as inactive'
  })
  @ApiResponse({
    status: 200,
    description: 'Checklist group deactivated successfully',
    type: ChecklistGroupEntity
  })
  @ApiResponse({
    status: 404,
    description: 'Checklist group not found'
  })
  @ApiParam({name: 'id', description: 'Checklist group ID'})
  @Put(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateGroup(@Param('id') id: string): Promise<ChecklistGroupEntity> {
    return this.groupService.deactivateGroup(id);
  }

  @ApiOperation({
    summary: 'Get groups by template',
    description: 'Get all groups that contain a specific template'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of groups containing the template',
    type: [ ChecklistGroupEntity ]
  })
  @ApiParam({name: 'templateId', description: 'Template ID'})
  @Get('template/:templateId')
  @HttpCode(HttpStatus.OK)
  async findGroupsByTemplate(@Param('templateId') templateId: string): Promise<ChecklistGroupEntity[]> {
    const query: QueryChecklistGroupDto = {templateId, includeTemplates: true};
    const [ items ] = await this.groupService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get active groups',
    description: 'Get all active checklist groups'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of active groups',
    type: [ ChecklistGroupEntity ]
  })
  @Get('active/list')
  @HttpCode(HttpStatus.OK)
  async findActiveGroups(): Promise<ChecklistGroupEntity[]> {
    const query: QueryChecklistGroupDto = {isActive: true};
    const [ items ] = await this.groupService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get groups by vehicle type',
    description: 'Get all groups applicable to a specific vehicle type'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of groups for the vehicle type',
    type: [ ChecklistGroupEntity ]
  })
  @ApiParam({name: 'vehicleType', description: 'Vehicle type'})
  @Get('vehicle-type/:vehicleType')
  @HttpCode(HttpStatus.OK)
  async findGroupsByVehicleType(@Param('vehicleType') vehicleType: string): Promise<ChecklistGroupEntity[]> {
    const query: QueryChecklistGroupDto = {vehicleType, isActive: true};
    const [ items ] = await this.groupService.findAll(query);
    return items;
  }

  @ApiOperation({
    summary: 'Get groups by user role',
    description: 'Get all groups executable by a specific user role'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of groups for the user role',
    type: [ ChecklistGroupEntity ]
  })
  @ApiParam({name: 'userRole', description: 'User role'})
  @Get('user-role/:userRole')
  @HttpCode(HttpStatus.OK)
  async findGroupsByUserRole(@Param('userRole') userRole: string): Promise<ChecklistGroupEntity[]> {
    const query: QueryChecklistGroupDto = {userRole, isActive: true};
    const [ items ] = await this.groupService.findAll(query);
    return items;
  }
}
