import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags }                       from '@nestjs/swagger';
import { ConfigService }                                                      from './config.service';
import { CreateFeatureToggleDto }                                             from './dto/create-feature-toggle.dto';
import { UpdateFeatureToggleDto }                                             from './dto/update-feature-toggle.dto';
import { FeatureToggleResponseDto }                                           from './dto/feature-toggle-response.dto';
import { ToggleFeatureDto }                                                   from './dto/toggle-feature.dto';
import { plainToClass }                                                       from 'class-transformer';
import { AuthGuard }                                                          from '@nestjs/passport';

@ApiTags('Config')
@Controller('config/features')
@UseGuards(AuthGuard('jwt'))
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Post()
  @ApiOperation({summary: 'Create a new feature toggle'})
  @ApiResponse({
    status: 201,
    description: 'Feature toggle successfully created',
    type: FeatureToggleResponseDto
  })
  async create(@Body() createDto: CreateFeatureToggleDto): Promise<FeatureToggleResponseDto> {
    const feature = await this.configService.createFeatureToggle(createDto);
    return plainToClass(FeatureToggleResponseDto, feature);
  }

  @Get()
  @ApiOperation({summary: 'Get all feature toggles'})
  @ApiQuery({name: 'enabled', required: false, type: Boolean})
  @ApiQuery({name: 'category', required: false})
  @ApiQuery({name: 'parentId', required: false, description: 'Filter by parent ID. Use "null" to get only root toggles'})
  @ApiResponse({
    status: 200,
    description: 'List of feature toggles',
    type: [ FeatureToggleResponseDto ]
  })
  async findAll(
    @Query('enabled') enabled?: string,
    @Query('category') category?: string,
    @Query('parentId') parentId?: string,
  ): Promise<FeatureToggleResponseDto[]> {
    const filters: any = {};

    if (enabled !== undefined) {
      filters.enabled = enabled === 'true';
    }

    if (category) {
      filters.category = category;
    }

    if (parentId === 'null') {
      filters.parentId = null;
    } else if (parentId) {
      filters.parentId = parentId;
    }

    const features = await this.configService.findAllFeatureToggles(filters);
    return features.map(feature => plainToClass(FeatureToggleResponseDto, feature));
  }

  @Get('hierarchy')
  @ApiOperation({summary: 'Get feature toggles as a hierarchical structure'})
  @ApiResponse({
    status: 200,
    description: 'Hierarchical structure of feature toggles',
    type: [ FeatureToggleResponseDto ]
  })
  async getHierarchy(): Promise<FeatureToggleResponseDto[]> {
    const features = await this.configService.getFeatureHierarchy();
    return features.map(feature => plainToClass(FeatureToggleResponseDto, feature));
  }

  @Get(':id')
  @ApiOperation({summary: 'Get a feature toggle by ID'})
  @ApiQuery({name: 'relations', required: false, type: Boolean, description: 'Include parent and children relations'})
  @ApiResponse({
    status: 200,
    description: 'Feature toggle found',
    type: FeatureToggleResponseDto
  })
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async findOne(
    @Param('id') id: string,
    @Query('relations') relations?: string,
  ): Promise<FeatureToggleResponseDto> {
    const includeRelations = relations === 'true';
    const feature = await this.configService.findFeatureToggleById(id, includeRelations);
    return plainToClass(FeatureToggleResponseDto, feature);
  }

  @Get('name/:name')
  @ApiOperation({summary: 'Get a feature toggle by name'})
  @ApiQuery({name: 'relations', required: false, type: Boolean, description: 'Include parent and children relations'})
  @ApiResponse({
    status: 200,
    description: 'Feature toggle found',
    type: FeatureToggleResponseDto
  })
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async findByName(
    @Param('name') name: string,
    @Query('relations') relations?: string,
  ): Promise<FeatureToggleResponseDto> {
    const includeRelations = relations === 'true';
    const feature = await this.configService.findFeatureToggleByName(name, includeRelations);
    return plainToClass(FeatureToggleResponseDto, feature);
  }

  @Get('status/:name')
  @ApiOperation({summary: 'Check if a feature toggle is enabled'})
  @ApiResponse({
    status: 200,
    description: 'Feature status',
    schema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean'
        }
      }
    }
  })
  async isEnabled(@Param('name') name: string): Promise<{ enabled: boolean }> {
    const enabled = await this.configService.isFeatureEnabled(name);
    return {enabled};
  }

  @Get(':id/children')
  @ApiOperation({summary: 'Get direct children of a feature toggle'})
  @ApiResponse({
    status: 200,
    description: 'Children of the feature toggle',
    type: [ FeatureToggleResponseDto ]
  })
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async getChildren(@Param('id') id: string): Promise<FeatureToggleResponseDto[]> {
    const features = await this.configService.findAllFeatureToggles({parentId: id});
    return features.map(feature => plainToClass(FeatureToggleResponseDto, feature));
  }

  @Put(':id')
  @ApiOperation({summary: 'Update a feature toggle'})
  @ApiResponse({
    status: 200,
    description: 'Feature toggle updated',
    type: FeatureToggleResponseDto
  })
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFeatureToggleDto,
  ): Promise<FeatureToggleResponseDto> {
    const feature = await this.configService.updateFeatureToggle(id, updateDto);
    return plainToClass(FeatureToggleResponseDto, feature);
  }

  @Put(':id/toggle')
  @ApiOperation({summary: 'Enable or disable a feature toggle'})
  @ApiResponse({
    status: 200,
    description: 'Feature toggle status updated',
    type: FeatureToggleResponseDto
  })
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async toggleFeature(
    @Param('id') id: string,
    @Body() toggleDto: ToggleFeatureDto,
  ): Promise<FeatureToggleResponseDto> {
    const feature = await this.configService.toggleFeature(id, toggleDto);
    return plainToClass(FeatureToggleResponseDto, feature);
  }

  @Delete(':id')
  @ApiOperation({summary: 'Delete a feature toggle and all its children'})
  @ApiResponse({status: 204, description: 'Feature toggle deleted'})
  @ApiResponse({status: 404, description: 'Feature toggle not found'})
  async remove(@Param('id') id: string): Promise<void> {
    await this.configService.removeFeatureToggle(id);
  }
}
