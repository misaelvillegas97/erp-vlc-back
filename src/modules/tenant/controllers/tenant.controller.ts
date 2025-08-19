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
}                                                                       from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, } from '@nestjs/swagger';
import { TenantRepository }                                             from '../repositories/tenant.repository';
import { TenantConfigService }                                          from '../services/tenant-config.service';
import { CreateTenantDto }                                              from '../dto/create-tenant.dto';
import { UpdateTenantDto }                                              from '../dto/update-tenant.dto';
import { TenantListResponseDto, TenantResponseDto }                     from '../dto/tenant-response.dto';
import { EventEmitter2 }                                                from '@nestjs/event-emitter';

/**
 * Query parameters for tenant list endpoint.
 */
class TenantQueryDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  planType?: string;
  region?: string;
}

/**
 * Controller for managing tenant operations.
 * Provides CRUD operations for tenant entities with proper validation and documentation.
 */
@ApiTags('Tenants')
@Controller('tenants')
@ApiBearerAuth()
export class TenantController {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantConfigService: TenantConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all tenants with optional filtering and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all tenants',
    description: 'Retrieve a paginated list of tenants with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tenants retrieved successfully',
    type: TenantListResponseDto,
  })
  async findAll(@Query() query: TenantQueryDto): Promise<TenantListResponseDto> {
    const {page = 1, limit = 10} = query;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    // For simplicity, we'll get all tenants and implement basic filtering
    // In a production app, you'd implement proper database filtering and pagination
    const allTenants = await this.tenantRepository.findAll();

    // Apply basic filtering
    let filteredTenants = allTenants;

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredTenants = filteredTenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm)
      );
    }

    if (query.planType) {
      filteredTenants = filteredTenants.filter(tenant =>
        tenant.planType === query.planType
      );
    }

    if (query.region) {
      filteredTenants = filteredTenants.filter(tenant =>
        tenant.region === query.region
      );
    }

    // Apply pagination
    const total = filteredTenants.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedTenants = filteredTenants.slice(offset, offset + limit);

    // Map to response DTOs
    const tenants: TenantResponseDto[] = paginatedTenants.map(this.mapToResponseDto);

    return {
      tenants,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a specific tenant by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieve a specific tenant by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the tenant',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${ id } not found`);
    }

    return this.mapToResponseDto(tenant);
  }

  /**
   * Create a new tenant.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new tenant',
    description: 'Create a new tenant with the provided information',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body(new ValidationPipe({transform: true})) createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    try {
      // Create the tenant
      const tenant = await this.tenantRepository.create({
        name: createTenantDto.name,
        subdomain: createTenantDto.subdomain,
        timezone: createTenantDto.timezone || 'UTC',
        planType: createTenantDto.planType,
        region: createTenantDto.region,
        settings: createTenantDto.settings,
      });

      // Emit event for tenant creation
      this.eventEmitter.emit('tenant.created', {
        tenantId: tenant.id,
        name: tenant.name,
        planType: tenant.planType,
      });

      return this.mapToResponseDto(tenant);
    } catch (error) {
      throw new BadRequestException(`Failed to create tenant: ${ error.message }`);
    }
  }

  /**
   * Update an existing tenant.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a tenant',
    description: 'Update an existing tenant with the provided information',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the tenant',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({transform: true})) updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    try {
      // Get the current tenant for comparison
      const currentTenant = await this.tenantRepository.findById(id);
      if (!currentTenant) {
        throw new NotFoundException(`Tenant with ID ${ id } not found`);
      }

      // Update the tenant
      const updatedTenant = await this.tenantRepository.update(id, updateTenantDto);

      if (!updatedTenant) {
        throw new NotFoundException(`Tenant with ID ${ id } not found`);
      }

      // Emit events for relevant changes
      if (updateTenantDto.isEnabled !== undefined && updateTenantDto.isEnabled !== currentTenant.isEnabled) {
        this.eventEmitter.emit('tenant.status.changed', {
          tenantId: id,
          isEnabled: updateTenantDto.isEnabled,
          previousStatus: currentTenant.isEnabled,
        });
      }

      // Emit general update event
      this.eventEmitter.emit('tenant.updated', {
        tenantId: id,
        changes: updateTenantDto,
      });

      return this.mapToResponseDto(updatedTenant);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update tenant: ${ error.message }`);
    }
  }

  /**
   * Delete a tenant (soft delete).
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a tenant',
    description: 'Soft delete a tenant by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the tenant',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const deleted = await this.tenantRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Tenant with ID ${ id } not found`);
    }

    // Emit event for tenant deletion (will trigger job cleanup)
    this.eventEmitter.emit('tenant.status.changed', {
      tenantId: id,
      isEnabled: false,
      previousStatus: true,
    });

    this.eventEmitter.emit('tenant.deleted', {
      tenantId: id,
    });

    return {
      message: `Tenant ${ id } deleted successfully`,
    };
  }

  /**
   * Get tenant context information.
   */
  @Get(':id/context')
  @ApiOperation({
    summary: 'Get tenant context',
    description: 'Retrieve tenant context information for debugging and monitoring',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the tenant',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant context retrieved successfully',
  })
  async getTenantContext(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const context = await this.tenantConfigService.getTenantContext(id);
      const cronConfig = await this.tenantConfigService.resolveCronConfig({tenantId: id});
      const gpsConfig = await this.tenantConfigService.resolveGpsProviderConfig(id);

      return {
        context,
        cronConfig: cronConfig.config,
        gpsConfig,
      };
    } catch (error) {
      throw new NotFoundException(`Tenant context not found: ${ error.message }`);
    }
  }

  /**
   * Health check endpoint for tenant management.
   */
  @Get('admin/health')
  @ApiOperation({
    summary: 'Tenant management health check',
    description: 'Health check endpoint for tenant management system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant management system is healthy',
  })
  async healthCheck() {
    const totalTenants = (await this.tenantRepository.findAll()).length;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      totalTenants,
      message: 'Tenant management system is operational',
    };
  }

  /**
   * Map tenant entity to response DTO.
   */
  private mapToResponseDto(tenant: any): TenantResponseDto {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      timezone: tenant.timezone,
      isEnabled: tenant.isEnabled,
      planType: tenant.planType,
      region: tenant.region,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
