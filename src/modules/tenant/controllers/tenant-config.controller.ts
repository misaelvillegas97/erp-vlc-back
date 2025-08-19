import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
}                                                                                 from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, } from '@nestjs/swagger';
import { TenantRepository }                                                       from '../repositories/tenant.repository';
import { TenantConfigService }                                                    from '../services/tenant-config.service';
import {
  BulkConfigUpdateDto,
  CronConfigDto,
  GpsProviderConfigDto,
  TenantConfigResponseDto,
  UpdateTenantConfigDto
}                                                                                 from '../dto/tenant-config.dto';
import { EventEmitter2 }                                                          from '@nestjs/event-emitter';

/**
 * Controller for managing tenant configuration settings.
 * Handles CRUD operations for tenant-specific configurations like cron jobs, GPS providers, and feature flags.
 */
@ApiTags('Tenant Configurations')
@Controller('tenants/:tenantId/config')
@ApiBearerAuth()
export class TenantConfigController {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantConfigService: TenantConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all configuration settings for a tenant.
   */
  @Get()
  @ApiOperation({
    summary: 'Get tenant configurations',
    description: 'Retrieve all configuration settings for a specific tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    description: 'Filter by configuration scope',
    enum: [ 'tenant', 'user' ],
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for user-scoped configurations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration settings retrieved successfully',
    type: [ TenantConfigResponseDto ],
  })
  async getConfigurations(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('scope') scope?: 'tenant' | 'user',
    @Query('userId') userId?: string,
  ): Promise<TenantConfigResponseDto[]> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    // Get tenant settings
    const settings = await this.tenantRepository.getTenantSettings(tenantId, scope, userId);

    return settings.map(setting => this.mapToConfigResponseDto(setting));
  }

  /**
   * Get a specific configuration setting.
   */
  @Get(':key')
  @ApiOperation({
    summary: 'Get specific configuration',
    description: 'Retrieve a specific configuration setting by key',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiParam({
    name: 'key',
    description: 'The configuration key',
    example: 'gps.sync',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    description: 'Configuration scope',
    enum: [ 'tenant', 'user' ],
    example: 'tenant',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for user-scoped configurations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
    type: TenantConfigResponseDto,
  })
  async getConfiguration(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('key') key: string,
    @Query('scope') scope: 'tenant' | 'user' = 'tenant',
    @Query('userId') userId?: string,
  ): Promise<TenantConfigResponseDto> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    const setting = await this.tenantRepository.getTenantSetting(tenantId, key, scope, userId);

    if (!setting) {
      throw new NotFoundException(`Configuration ${ key } not found for tenant ${ tenantId }`);
    }

    return this.mapToConfigResponseDto(setting);
  }

  /**
   * Create or update a configuration setting.
   */
  @Put(':key')
  @ApiOperation({
    summary: 'Update configuration setting',
    description: 'Create or update a specific configuration setting',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiParam({
    name: 'key',
    description: 'The configuration key',
    example: 'gps.sync',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration updated successfully',
    type: TenantConfigResponseDto,
  })
  async updateConfiguration(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('key') key: string,
    @Body(new ValidationPipe({transform: true})) updateDto: UpdateTenantConfigDto,
  ): Promise<TenantConfigResponseDto> {
    try {
      // Verify tenant exists
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new NotFoundException(`Tenant ${ tenantId } not found`);
      }

      // Override key from URL parameter
      const configData = {...updateDto, key};

      // Update configuration using service (includes validation)
      await this.tenantConfigService.updateTenantConfig(
        tenantId,
        key,
        configData.value,
        configData.userId,
        configData.description,
      );

      // Emit configuration change event
      this.eventEmitter.emit('tenant.config.changed', {
        tenantId,
        configKey: key,
        newValue: configData.value,
        userId: configData.userId,
      });

      // Get the updated setting
      const updatedSetting = await this.tenantRepository.getTenantSetting(
        tenantId,
        key,
        configData.scope || 'tenant',
        configData.userId,
      );

      if (!updatedSetting) {
        throw new Error('Failed to retrieve updated configuration');
      }

      return this.mapToConfigResponseDto(updatedSetting);
    } catch (error) {
      throw new BadRequestException(`Failed to update configuration: ${ error.message }`);
    }
  }

  /**
   * Delete a configuration setting.
   */
  @Delete(':key')
  @ApiOperation({
    summary: 'Delete configuration setting',
    description: 'Delete a specific configuration setting',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiParam({
    name: 'key',
    description: 'The configuration key',
    example: 'gps.sync',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    description: 'Configuration scope',
    enum: [ 'tenant', 'user' ],
    example: 'tenant',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for user-scoped configurations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration deleted successfully',
  })
  async deleteConfiguration(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('key') key: string,
    @Query('scope') scope: 'tenant' | 'user' = 'tenant',
    @Query('userId') userId?: string,
  ): Promise<{ message: string }> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    const deleted = await this.tenantRepository.deleteTenantSetting(tenantId, key, scope, userId);

    if (!deleted) {
      throw new NotFoundException(`Configuration ${ key } not found for tenant ${ tenantId }`);
    }

    // Emit configuration change event
    this.eventEmitter.emit('tenant.config.changed', {
      tenantId,
      configKey: key,
      newValue: null,
      userId,
    });

    return {
      message: `Configuration ${ key } deleted successfully for tenant ${ tenantId }`,
    };
  }

  /**
   * Bulk update configurations.
   */
  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk update configurations',
    description: 'Update multiple configuration settings at once',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configurations updated successfully',
  })
  async bulkUpdateConfigurations(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body(new ValidationPipe({transform: true})) bulkUpdate: BulkConfigUpdateDto,
  ): Promise<{ message: string; updated: number }> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    let updatedCount = 0;

    for (const config of bulkUpdate.configurations) {
      try {
        await this.tenantConfigService.updateTenantConfig(
          tenantId,
          config.key,
          config.value,
          config.userId,
          config.description,
        );

        // Emit configuration change event for each update
        this.eventEmitter.emit('tenant.config.changed', {
          tenantId,
          configKey: config.key,
          newValue: config.value,
          userId: config.userId,
        });

        updatedCount++;
      } catch (error) {
        // Log error but continue with other configurations
        console.error(`Failed to update config ${ config.key }: ${ error.message }`);
      }
    }

    return {
      message: `Bulk configuration update completed for tenant ${ tenantId }`,
      updated: updatedCount,
    };
  }

  /**
   * Get resolved cron configuration for tenant.
   */
  @Get('cron/resolved')
  @ApiOperation({
    summary: 'Get resolved cron configuration',
    description: 'Get the effective cron configuration after hierarchy resolution',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for user-specific resolution',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resolved cron configuration retrieved successfully',
  })
  async getResolvedCronConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const {config} = await this.tenantConfigService.resolveCronConfig({
        tenantId,
        userId,
      });

      return config;
    } catch (error) {
      throw new NotFoundException(`Failed to resolve cron configuration: ${ error.message }`);
    }
  }

  /**
   * Update cron configuration.
   */
  @Put('cron')
  @ApiOperation({
    summary: 'Update cron configuration',
    description: 'Update the cron job configuration for the tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cron configuration updated successfully',
  })
  async updateCronConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body(new ValidationPipe({transform: true})) cronConfig: CronConfigDto,
  ) {
    try {
      await this.tenantConfigService.updateTenantConfig(
        tenantId,
        'gps.sync',
        cronConfig,
        undefined,
        'GPS sync cron configuration',
      );

      return {
        message: 'Cron configuration updated successfully',
        configuration: cronConfig,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update cron configuration: ${ error.message }`);
    }
  }

  /**
   * Get GPS provider configuration.
   */
  @Get('gps/provider')
  @ApiOperation({
    summary: 'Get GPS provider configuration',
    description: 'Get the GPS provider configuration for the tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'GPS provider configuration retrieved successfully',
  })
  async getGpsProviderConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    try {
      return await this.tenantConfigService.resolveGpsProviderConfig(tenantId);
    } catch (error) {
      throw new NotFoundException(`Failed to get GPS provider configuration: ${ error.message }`);
    }
  }

  /**
   * Update GPS provider configuration.
   */
  @Put('gps/provider')
  @ApiOperation({
    summary: 'Update GPS provider configuration',
    description: 'Update the GPS provider configuration for the tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'GPS provider configuration updated successfully',
  })
  async updateGpsProviderConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body(new ValidationPipe({transform: true})) gpsConfig: GpsProviderConfigDto,
  ) {
    try {
      // Update GPS provider settings
      await this.tenantConfigService.updateTenantConfig(
        tenantId,
        'gps.provider',
        {
          provider: gpsConfig.provider,
          baseUrl: gpsConfig.baseUrl,
          isEnabled: gpsConfig.isEnabled,
        },
        undefined,
        'GPS provider configuration',
      );

      // Update GPS credentials separately
      await this.tenantConfigService.updateTenantConfig(
        tenantId,
        'gps.credentials',
        {
          secretRef: gpsConfig.apiKeySecretRef,
        },
        undefined,
        'GPS provider credentials reference',
      );

      return {
        message: 'GPS provider configuration updated successfully',
        configuration: gpsConfig,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update GPS provider configuration: ${ error.message }`);
    }
  }

  /**
   * Map tenant settings entity to configuration response DTO.
   */
  private mapToConfigResponseDto(setting: any): TenantConfigResponseDto {
    return {
      id: setting.id,
      tenantId: setting.tenantId,
      key: setting.key,
      value: setting.value,
      scope: setting.scope,
      userId: setting.userId,
      description: setting.description,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }
}
