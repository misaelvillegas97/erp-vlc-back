import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, }                      from '@nestjs/swagger';
import { AuthGuard }                                                                         from '@nestjs/passport';
import { FieldService }                                                                      from '../services/field.service';
import { CreateFieldCategoryDto }                                                            from '../domain/dto/create-field-category.dto';
import { UpdateFieldCategoryDto }                                                            from '../domain/dto/update-field-category.dto';
import { FieldCategoryResponseDto }                                                          from '../domain/dto/field-category-response.dto';
import { CreateFieldDefDto }                                                                 from '../domain/dto/create-field-def.dto';
import { UpdateFieldDefDto }                                                                 from '../domain/dto/update-field-def.dto';
import { FieldDefResponseDto }                                                               from '../domain/dto/field-def-response.dto';

/**
 * Controller for field and category operations
 * Handles CRUD operations for dynamic fields and their categories
 */
@ApiTags('Fields & Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  // ========== FIELD CATEGORIES ==========

  /**
   * Create a new field category
   */
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new field category',
    description: 'Creates a new category for organizing fields within a flow version',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Field category created successfully',
    type: FieldCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or version is not DRAFT',
  })
  async createFieldCategory(
    @Body() createDto: CreateFieldCategoryDto,
  ): Promise<FieldCategoryResponseDto> {
    return this.fieldService.createFieldCategory(createDto);
  }

  /**
   * Get all categories for a flow version
   */
  @Get('categories/version/:versionId')
  @ApiOperation({
    summary: 'Get all categories for a flow version',
    description: 'Retrieves all field categories for a specific flow version',
  })
  @ApiParam({
    name: 'versionId',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field categories retrieved successfully',
    type: [ FieldCategoryResponseDto ],
  })
  async findCategoriesByVersion(
    @Param('versionId') versionId: string,
  ): Promise<FieldCategoryResponseDto[]> {
    return this.fieldService.findCategoriesByVersion(versionId);
  }

  /**
   * Get a field category by ID
   */
  @Get('categories/:id')
  @ApiOperation({
    summary: 'Get field category by ID',
    description: 'Retrieves a specific field category by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Field category ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field category retrieved successfully',
    type: FieldCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field category not found',
  })
  async findCategoryById(
    @Param('id') id: string,
  ): Promise<FieldCategoryResponseDto> {
    return this.fieldService.findCategoryById(id);
  }

  /**
   * Update a field category
   */
  @Put('categories/:id')
  @ApiOperation({
    summary: 'Update field category',
    description: 'Updates a field category (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Field category ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field category updated successfully',
    type: FieldCategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT or invalid input',
  })
  async updateFieldCategory(
    @Param('id') id: string,
    @Body() updateDto: UpdateFieldCategoryDto,
  ): Promise<FieldCategoryResponseDto> {
    return this.fieldService.updateFieldCategory(id, updateDto);
  }

  /**
   * Delete a field category
   */
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete field category',
    description: 'Deletes a field category (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Field category ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Field category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT',
  })
  async deleteFieldCategory(@Param('id') id: string): Promise<void> {
    return this.fieldService.deleteFieldCategory(id);
  }

  // ========== FIELD DEFINITIONS ==========

  /**
   * Create a new field definition
   */
  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new field definition',
    description: 'Creates a new dynamic field definition within a step',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Field definition created successfully',
    type: FieldDefResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or version is not DRAFT',
  })
  async createFieldDef(
    @Body() createDto: CreateFieldDefDto,
  ): Promise<FieldDefResponseDto> {
    return this.fieldService.createFieldDef(createDto);
  }

  /**
   * Get all field definitions for a step
   */
  @Get('definitions/step/:stepId')
  @ApiOperation({
    summary: 'Get all field definitions for a step',
    description: 'Retrieves all field definitions for a specific step',
  })
  @ApiParam({
    name: 'stepId',
    description: 'Flow step ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field definitions retrieved successfully',
    type: [ FieldDefResponseDto ],
  })
  async findFieldDefsByStep(
    @Param('stepId') stepId: string,
  ): Promise<FieldDefResponseDto[]> {
    return this.fieldService.findFieldDefsByStep(stepId);
  }

  /**
   * Get a field definition by ID
   */
  @Get('definitions/:id')
  @ApiOperation({
    summary: 'Get field definition by ID',
    description: 'Retrieves a specific field definition by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Field definition ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field definition retrieved successfully',
    type: FieldDefResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field definition not found',
  })
  async findFieldDefById(
    @Param('id') id: string,
  ): Promise<FieldDefResponseDto> {
    return this.fieldService.findFieldDefById(id);
  }

  /**
   * Update a field definition
   */
  @Put('definitions/:id')
  @ApiOperation({
    summary: 'Update field definition',
    description: 'Updates a field definition (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Field definition ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field definition updated successfully',
    type: FieldDefResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field definition not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT or invalid input',
  })
  async updateFieldDef(
    @Param('id') id: string,
    @Body() updateDto: UpdateFieldDefDto,
  ): Promise<FieldDefResponseDto> {
    return this.fieldService.updateFieldDef(id, updateDto);
  }

  /**
   * Delete a field definition
   */
  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete field definition',
    description: 'Deletes a field definition (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Field definition ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Field definition deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Field definition not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT',
  })
  async deleteFieldDef(@Param('id') id: string): Promise<void> {
    return this.fieldService.deleteFieldDef(id);
  }
}
