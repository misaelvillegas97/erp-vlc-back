import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, }                      from '@nestjs/swagger';
import { AuthGuard }                                                                         from '@nestjs/passport';
import { FlowVersionService }                                                                from '../services/flow-version.service';
import { CreateFlowVersionDto }                                                              from '../domain/dto/create-flow-version.dto';
import { FlowVersionResponseDto }                                                            from '../domain/dto/flow-version-response.dto';

/**
 * Controller for flow version operations
 * Handles versioning, publication, and archiving of flow versions
 */
@ApiTags('Flow Versions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/versions')
export class FlowVersionController {
  constructor(private readonly flowVersionService: FlowVersionService) {}

  /**
   * Create a new flow version
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new flow version',
    description: 'Creates a new flow version, optionally cloning from an existing version',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Flow version created successfully',
    type: FlowVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template or source version not found',
  })
  async createFlowVersion(
    @Body() createDto: CreateFlowVersionDto,
  ): Promise<FlowVersionResponseDto> {
    return this.flowVersionService.createFlowVersion(createDto);
  }

  /**
   * Get all versions for a template
   */
  @Get('template/:templateId')
  @ApiOperation({
    summary: 'Get all versions for a template',
    description: 'Retrieves all versions for a specific flow template',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Flow template ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow versions retrieved successfully',
    type: [ FlowVersionResponseDto ],
  })
  async findVersionsByTemplate(
    @Param('templateId') templateId: string,
  ): Promise<FlowVersionResponseDto[]> {
    return this.flowVersionService.findVersionsByTemplate(templateId);
  }

  /**
   * Get a flow version by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get flow version by ID',
    description: 'Retrieves a specific flow version by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow version retrieved successfully',
    type: FlowVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow version not found',
  })
  async findVersionById(
    @Param('id') id: string,
  ): Promise<FlowVersionResponseDto> {
    return this.flowVersionService.findVersionById(id);
  }

  /**
   * Update a flow version (only DRAFT versions)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update flow version',
    description: 'Updates a flow version (only DRAFT versions can be modified)',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow version updated successfully',
    type: FlowVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow version not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only DRAFT versions can be modified',
  })
  async updateFlowVersion(
    @Param('id') id: string,
    @Body() updateData: Partial<Pick<CreateFlowVersionDto, 'notes'>>,
  ): Promise<FlowVersionResponseDto> {
    return this.flowVersionService.updateFlowVersion(id, updateData);
  }

  /**
   * Publish a flow version
   */
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish flow version',
    description: 'Publishes a DRAFT version, making it immutable and available for execution',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow version published successfully',
    type: FlowVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow version not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only DRAFT versions can be published',
  })
  async publishFlowVersion(
    @Param('id') id: string,
    @Body() publishData: { publishedBy: string },
  ): Promise<FlowVersionResponseDto> {
    return this.flowVersionService.publishFlowVersion(id, publishData.publishedBy);
  }

  /**
   * Archive a flow version
   */
  @Post(':id/archive')
  @ApiOperation({
    summary: 'Archive flow version',
    description: 'Archives a PUBLISHED version, preventing new executions',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow version archived successfully',
    type: FlowVersionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow version not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DRAFT versions cannot be archived',
  })
  async archiveFlowVersion(
    @Param('id') id: string,
  ): Promise<FlowVersionResponseDto> {
    return this.flowVersionService.archiveFlowVersion(id);
  }

  /**
   * Delete a flow version (only DRAFT versions)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete flow version',
    description: 'Deletes a DRAFT version (published versions cannot be deleted)',
  })
  @ApiParam({
    name: 'id',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Flow version deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Flow version not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only DRAFT versions can be deleted',
  })
  async deleteFlowVersion(@Param('id') id: string): Promise<void> {
    return this.flowVersionService.deleteFlowVersion(id);
  }
}
