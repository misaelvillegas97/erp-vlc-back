import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, }                      from '@nestjs/swagger';
import { AuthGuard }                                                                         from '@nestjs/passport';
import { TerminationRuleService }                                                            from '../services/termination-rule.service';
import { CreateTerminationRuleDto }                                                          from '../domain/dto/create-termination-rule.dto';
import { UpdateTerminationRuleDto }                                                          from '../domain/dto/update-termination-rule.dto';
import { TerminationRuleResponseDto }                                                        from '../domain/dto/termination-rule-response.dto';

/**
 * Controller for termination rule operations
 * Handles CRUD operations for flow termination rules and automations
 */
@ApiTags('Termination Rules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/rules')
export class TerminationRuleController {
  constructor(private readonly terminationRuleService: TerminationRuleService) {}

  /**
   * Create a new termination rule
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new termination rule',
    description: 'Creates a new termination rule with conditions and actions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Termination rule created successfully',
    type: TerminationRuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or version is not DRAFT',
  })
  async createTerminationRule(
    @Body() createDto: CreateTerminationRuleDto,
  ): Promise<TerminationRuleResponseDto> {
    return this.terminationRuleService.createTerminationRule(createDto);
  }

  /**
   * Get all termination rules for a flow version
   */
  @Get('version/:versionId')
  @ApiOperation({
    summary: 'Get all termination rules for a flow version',
    description: 'Retrieves all termination rules for a specific flow version',
  })
  @ApiParam({
    name: 'versionId',
    description: 'Flow version ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Termination rules retrieved successfully',
    type: [ TerminationRuleResponseDto ],
  })
  async findRulesByVersion(
    @Param('versionId') versionId: string,
  ): Promise<TerminationRuleResponseDto[]> {
    return this.terminationRuleService.findRulesByVersion(versionId);
  }

  /**
   * Get a termination rule by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get termination rule by ID',
    description: 'Retrieves a specific termination rule by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Termination rule ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Termination rule retrieved successfully',
    type: TerminationRuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Termination rule not found',
  })
  async findRuleById(
    @Param('id') id: string,
  ): Promise<TerminationRuleResponseDto> {
    return this.terminationRuleService.findRuleById(id);
  }

  /**
   * Update a termination rule
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update termination rule',
    description: 'Updates a termination rule (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Termination rule ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Termination rule updated successfully',
    type: TerminationRuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Termination rule not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT or invalid input',
  })
  async updateTerminationRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateTerminationRuleDto,
  ): Promise<TerminationRuleResponseDto> {
    return this.terminationRuleService.updateTerminationRule(id, updateDto);
  }

  /**
   * Delete a termination rule
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete termination rule',
    description: 'Deletes a termination rule (only if version is DRAFT)',
  })
  @ApiParam({
    name: 'id',
    description: 'Termination rule ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Termination rule deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Termination rule not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Version is not DRAFT',
  })
  async deleteTerminationRule(@Param('id') id: string): Promise<void> {
    return this.terminationRuleService.deleteTerminationRule(id);
  }

  /**
   * Test a termination rule condition
   */
  @Post(':id/test')
  @ApiOperation({
    summary: 'Test termination rule condition',
    description: 'Tests a termination rule condition with sample data',
  })
  @ApiParam({
    name: 'id',
    description: 'Termination rule ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rule condition tested successfully',
    schema: {
      type: 'object',
      properties: {
        result: {type: 'boolean'},
        evaluation: {type: 'object'},
        errors: {type: 'array', items: {type: 'string'}}
      }
    }
  })
  async testRuleCondition(
    @Param('id') id: string,
    @Body() testData: {
      fields?: Record<string, any>;
      waste?: Record<string, any>;
      context?: Record<string, any>
    },
  ): Promise<{
    result: boolean;
    evaluation: any;
    errors: string[];
  }> {
    return this.terminationRuleService.testRuleCondition(id, testData);
  }

  /**
   * Get available action types
   */
  @Get('actions/types')
  @ApiOperation({
    summary: 'Get available action types',
    description: 'Retrieves all available action types for termination rules',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action types retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {type: 'string'},
          name: {type: 'string'},
          description: {type: 'string'},
          parameters: {type: 'object'}
        }
      }
    }
  })
  async getActionTypes(): Promise<Array<{
    type: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>> {
    return this.terminationRuleService.getActionTypes();
  }
}
