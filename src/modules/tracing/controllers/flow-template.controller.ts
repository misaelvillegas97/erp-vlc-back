import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, }                   from '@nestjs/swagger';
import { AuthGuard }                                                                                from '@nestjs/passport';
import { FlowTemplateService }                                                                      from '../services/flow-template.service';
import { CreateFlowTemplateDto }                                                                    from '../domain/dto/create-flow-template.dto';
import { FlowTemplateResponseDto }                                                                  from '../domain/dto/flow-template-response.dto';

/**
 * Controller for flow template operations
 * Handles CRUD operations for flow templates
 */
@ApiTags('Flow Templates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/templates')
export class FlowTemplateController {
  constructor(private readonly flowTemplateService: FlowTemplateService) {}

  /**
   * Create a new flow template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new flow template',
    description: 'Creates a new flow template with the provided information',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Flow template created successfully',
    type: FlowTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Flow template with the same name already exists',
  })
  async createFlowTemplate(
    @Body() createDto: CreateFlowTemplateDto,
  ): Promise<FlowTemplateResponseDto> {
    return this.flowTemplateService.createFlowTemplate(createDto);
  }

  /**
   * Get all flow templates with optional filters
   */
  @Get()
  @ApiOperation({
    summary: 'Get all flow templates',
    description: 'Retrieves all flow templates with optional filtering',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by template name (partial match)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow templates retrieved successfully',
    type: [ FlowTemplateResponseDto ],
  })
  async findAllFlowTemplates(
    @Query('name') name?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<FlowTemplateResponseDto[]> {
    const filters = {name, isActive};
    return this.flowTemplateService.findAllFlowTemplates(filters);
  }

  /**
   * Get a flow template by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get flow template by ID',
    description: 'Retrieves a specific flow template by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow template ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow template retrieved successfully',
    type: FlowTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow template not found',
  })
  async findFlowTemplateById(
    @Param('id') id: string,
  ): Promise<FlowTemplateResponseDto> {
    return this.flowTemplateService.findFlowTemplateById(id);
  }

  /**
   * Update a flow template
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update flow template',
    description: 'Updates an existing flow template',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow template ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow template updated successfully',
    type: FlowTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Flow template with the same name already exists',
  })
  async updateFlowTemplate(
    @Param('id') id: string,
    @Body() updateData: Partial<Pick<CreateFlowTemplateDto, 'name' | 'description'>>,
  ): Promise<FlowTemplateResponseDto> {
    return this.flowTemplateService.updateFlowTemplate(id, updateData);
  }

  /**
   * Delete a flow template (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete flow template',
    description: 'Soft deletes a flow template by setting isActive to false',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow template ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Flow template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow template not found',
  })
  async deleteFlowTemplate(@Param('id') id: string): Promise<void> {
    return this.flowTemplateService.deleteFlowTemplate(id);
  }
}
