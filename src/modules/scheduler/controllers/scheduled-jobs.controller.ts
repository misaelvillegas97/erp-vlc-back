import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
}                                                                                 from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, } from '@nestjs/swagger';
import { JobRegistryService }                                                     from '../services/job-registry.service';
import { ConfigChangeListenerService }                                            from '../services/config-change-listener.service';
import { TenantRepository }                                                       from '../../tenant/repositories/tenant.repository';

/**
 * Response DTO for job information.
 */
interface JobResponseDto {
  id: string;
  tenantId: string;
  jobType: string;
  pattern: string;
  tz: string;
  key: string;
  nextRunTime?: Date;
}

/**
 * Response DTO for queue statistics.
 */
interface QueueStatsResponseDto {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  repeatableJobs: number;
  lastUpdated: string;
}

/**
 * Response DTO for tenant job sync status.
 */
interface TenantJobSyncStatusDto {
  tenantId: string;
  hasActiveJobs: boolean;
  jobCount: number;
  lastSyncAttempt?: Date;
  syncErrors?: string[];
}

/**
 * Controller for managing scheduled jobs and monitoring the job queue.
 * Provides endpoints for job management, monitoring, and troubleshooting.
 */
@ApiTags('Scheduled Jobs')
@Controller('jobs')
@ApiBearerAuth()
export class ScheduledJobsController {
  constructor(
    private readonly jobRegistryService: JobRegistryService,
    private readonly configChangeListener: ConfigChangeListenerService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Get all scheduled jobs across all tenants.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all scheduled jobs',
    description: 'Retrieve all repeatable jobs across all tenants',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of scheduled jobs retrieved successfully',
  })
  async getAllJobs(): Promise<JobResponseDto[]> {
    const jobs = await this.jobRegistryService.getAllJobs();

    return jobs.map(job => ({
      id: job.id || 'unknown',
      tenantId: this.extractTenantIdFromJobId(job.id || ''),
      jobType: job.name || 'unknown',
      pattern: job.pattern || 'unknown',
      tz: job.tz || 'UTC',
      key: job.key || 'unknown',
      nextRunTime: job.next ? new Date(job.next) : undefined,
    }));
  }

  /**
   * Get scheduled jobs for a specific tenant.
   */
  @Get('tenant/:tenantId')
  @ApiOperation({
    summary: 'Get jobs for tenant',
    description: 'Retrieve all scheduled jobs for a specific tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant jobs retrieved successfully',
  })
  async getTenantJobs(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<JobResponseDto[]> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    const jobs = await this.jobRegistryService.getTenantJobs(tenantId);

    return jobs.map(job => ({
      id: job.id || 'unknown',
      tenantId: tenantId,
      jobType: job.name || 'unknown',
      pattern: job.pattern || 'unknown',
      tz: job.tz || 'UTC',
      key: job.key || 'unknown',
      nextRunTime: job.next ? new Date(job.next) : undefined,
    }));
  }

  /**
   * Get queue statistics.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Retrieve current job queue statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
    type: Object,
  })
  async getQueueStats(): Promise<QueueStatsResponseDto> {
    const stats = await this.jobRegistryService.getQueueStats();

    return {
      ...stats,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Manually trigger job synchronization for a tenant.
   */
  @Post('tenant/:tenantId/sync')
  @ApiOperation({
    summary: 'Trigger job synchronization',
    description: 'Manually trigger job synchronization for a specific tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for user-specific job sync',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job synchronization triggered successfully',
  })
  async triggerTenantJobSync(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('userId') userId?: string,
  ): Promise<{ message: string }> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    try {
      await this.configChangeListener.triggerTenantJobUpdate(tenantId, userId);

      return {
        message: `Job synchronization triggered successfully for tenant ${ tenantId }`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to trigger job sync: ${ error.message }`);
    }
  }

  /**
   * Get job synchronization status for a tenant.
   */
  @Get('tenant/:tenantId/sync-status')
  @ApiOperation({
    summary: 'Get job sync status',
    description: 'Get the current synchronization status for a tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync status retrieved successfully',
    type: Object,
  })
  async getTenantSyncStatus(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantJobSyncStatusDto> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    return await this.configChangeListener.getTenantSyncStatus(tenantId);
  }

  /**
   * Clear all jobs for a tenant (use with caution).
   */
  @Delete('tenant/:tenantId')
  @ApiOperation({
    summary: 'Clear tenant jobs',
    description: 'Remove all scheduled jobs for a specific tenant (use with caution)',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant jobs cleared successfully',
  })
  async clearTenantJobs(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<{ message: string }> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    try {
      await this.jobRegistryService.clearTenantJobs(tenantId);

      return {
        message: `All jobs cleared successfully for tenant ${ tenantId }`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to clear tenant jobs: ${ error.message }`);
    }
  }

  /**
   * Trigger bulk tenant synchronization.
   */
  @Post('bulk-sync')
  @ApiOperation({
    summary: 'Trigger bulk synchronization',
    description: 'Trigger job synchronization for multiple tenants or all tenants',
  })
  @ApiQuery({
    name: 'tenantIds',
    required: false,
    description: 'Comma-separated list of tenant IDs (if not provided, syncs all tenants)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk synchronization triggered successfully',
  })
  async triggerBulkSync(
    @Query('tenantIds') tenantIdsParam?: string,
  ): Promise<{ message: string; tenantCount: number }> {
    let tenantIds: string[] | undefined;

    if (tenantIdsParam) {
      tenantIds = tenantIdsParam.split(',').map(id => id.trim());

      // Validate that all provided tenant IDs exist
      for (const tenantId of tenantIds) {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
          throw new NotFoundException(`Tenant ${ tenantId } not found`);
        }
      }
    }

    try {
      // Emit bulk sync event
      const event = {tenantIds};
      await this.configChangeListener.onBulkTenantSync(event);

      const tenantCount = tenantIds ? tenantIds.length : 0; // 0 means all tenants

      return {
        message: `Bulk synchronization triggered for ${ tenantCount || 'all' } tenants`,
        tenantCount,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to trigger bulk sync: ${ error.message }`);
    }
  }

  /**
   * Health check endpoint for the job scheduler.
   */
  @Get('health')
  @ApiOperation({
    summary: 'Scheduler health check',
    description: 'Check the health status of the job scheduler',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler health status retrieved successfully',
  })
  async healthCheck() {
    try {
      const stats = await this.jobRegistryService.getQueueStats();
      const allJobs = await this.jobRegistryService.getAllJobs();

      // Calculate some basic health metrics
      const isHealthy = stats.active >= 0 && stats.repeatableJobs >= 0;
      const tenantsWithJobs = new Set(
        allJobs.map(job => this.extractTenantIdFromJobId(job.id || '')).filter(Boolean)
      ).size;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        queueStats: stats,
        totalRepeatableJobs: stats.repeatableJobs,
        tenantsWithJobs,
        message: isHealthy ? 'Job scheduler is operational' : 'Job scheduler has issues',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        message: 'Failed to retrieve scheduler health status',
      };
    }
  }

  /**
   * Extract tenant ID from job ID.
   * Job IDs are formatted as "jobType:tenantId"
   */
  private extractTenantIdFromJobId(jobId: string): string {
    const parts = jobId.split(':');
    return parts.length >= 2 ? parts[1] : 'unknown';
  }
}
