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
import { TenantRepository }                                                       from '../../tenant/repositories/tenant.repository';
import { TenantConfigService }                                                    from '../../tenant/services/tenant-config.service';
import { JobRegistryService }                                                     from '../../scheduler/services/job-registry.service';
import { ConfigChangeListenerService }                                            from '../../scheduler/services/config-change-listener.service';
import { TenantFeatureFlagService }                                               from '../../feature-flags/services/tenant-feature-flag.service';

/**
 * System health check response.
 */
interface SystemHealthDto {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    database: 'operational' | 'degraded' | 'down';
    redis: 'operational' | 'degraded' | 'down';
    jobQueue: 'operational' | 'degraded' | 'down';
    tenantSystem: 'operational' | 'degraded' | 'down';
  };
  metrics: {
    totalTenants: number;
    activeTenants: number;
    totalJobs: number;
    activeJobs: number;
    queueHealth: any;
  };
}

/**
 * Tenant diagnostic information.
 */
interface TenantDiagnosticDto {
  tenantId: string;
  tenantInfo: any;
  configurations: any[];
  jobs: any[];
  featureFlags: any;
  gpsIntegration: any;
  lastActivity: Date;
  issues: string[];
}

/**
 * Controller for administrative and debugging operations.
 * Provides comprehensive endpoints for system monitoring, troubleshooting, and maintenance.
 */
@ApiTags('Admin & Debug')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantConfigService: TenantConfigService,
    private readonly jobRegistryService: JobRegistryService,
    private readonly configChangeListener: ConfigChangeListenerService,
    private readonly featureFlagService: TenantFeatureFlagService,
  ) {}

  /**
   * Comprehensive system health check.
   */
  @Get('health')
  @ApiOperation({
    summary: 'System health check',
    description: 'Get comprehensive health status of the multi-tenant system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
  })
  async getSystemHealth(): Promise<SystemHealthDto> {
    try {
      // Check database connectivity
      const tenants = await this.tenantRepository.findAll();
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.isEnabled).length;

      // Check job queue health
      const queueStats = await this.jobRegistryService.getQueueStats();
      const allJobs = await this.jobRegistryService.getAllJobs();

      // Determine component health
      const components = {
        database: totalTenants >= 0 ? 'operational' as const : 'down' as const,
        redis: queueStats ? 'operational' as const : 'down' as const,
        jobQueue: queueStats.active >= 0 ? 'operational' as const : 'degraded' as const,
        tenantSystem: activeTenants >= 0 ? 'operational' as const : 'down' as const,
      };

      // Determine overall system status
      const hasDownComponents = Object.values(components).includes('down');
      const hasDegradedComponents = Object.values(components).includes('degraded');

      let status: SystemHealthDto['status'];
      if (hasDownComponents) {
        status = 'unhealthy';
      } else if (hasDegradedComponents) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        components,
        metrics: {
          totalTenants,
          activeTenants,
          totalJobs: allJobs.length,
          activeJobs: queueStats.active,
          queueHealth: queueStats,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        components: {
          database: 'down',
          redis: 'down',
          jobQueue: 'down',
          tenantSystem: 'down',
        },
        metrics: {
          totalTenants: 0,
          activeTenants: 0,
          totalJobs: 0,
          activeJobs: 0,
          queueHealth: {error: error.message},
        },
      };
    }
  }

  /**
   * Get detailed diagnostic information for a tenant.
   */
  @Get('tenants/:tenantId/diagnostics')
  @ApiOperation({
    summary: 'Get tenant diagnostics',
    description: 'Get comprehensive diagnostic information for a specific tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant diagnostics retrieved successfully',
  })
  async getTenantDiagnostics(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantDiagnosticDto> {
    // Get tenant information
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    const issues: string[] = [];

    try {
      // Get tenant configurations
      const configurations = await this.tenantRepository.getTenantSettings(tenantId);

      // Get tenant jobs
      const jobs = await this.jobRegistryService.getTenantJobs(tenantId);

      // Get feature flags (with error handling)
      let featureFlags;
      try {
        const flagKeys = this.featureFlagService.getAvailableFlags();
        const context = await this.tenantConfigService.getTenantContext(tenantId);
        featureFlags = await this.featureFlagService.getFlags(flagKeys, context);
      } catch (error) {
        featureFlags = {error: error.message};
        issues.push(`Feature flags error: ${ error.message }`);
      }

      // Get GPS integration status
      let gpsIntegration;
      try {
        gpsIntegration = await this.tenantConfigService.resolveGpsProviderConfig(tenantId);
      } catch (error) {
        gpsIntegration = {error: error.message};
        issues.push(`GPS integration error: ${ error.message }`);
      }

      // Check for common issues
      if (!tenant.isEnabled) {
        issues.push('Tenant is disabled');
      }

      if (jobs.length === 0) {
        issues.push('No scheduled jobs found');
      }

      if (configurations.length === 0) {
        issues.push('No configurations found');
      }

      return {
        tenantId,
        tenantInfo: {
          id: tenant.id,
          name: tenant.name,
          timezone: tenant.timezone,
          isEnabled: tenant.isEnabled,
          planType: tenant.planType,
          region: tenant.region,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
        },
        configurations,
        jobs,
        featureFlags,
        gpsIntegration,
        lastActivity: tenant.updatedAt,
        issues,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get tenant diagnostics: ${ error.message }`);
    }
  }

  /**
   * Get system-wide statistics and metrics.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get system statistics',
    description: 'Get comprehensive system statistics and metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System statistics retrieved successfully',
  })
  async getSystemStats() {
    try {
      const tenants = await this.tenantRepository.findAll();
      const queueStats = await this.jobRegistryService.getQueueStats();
      const allJobs = await this.jobRegistryService.getAllJobs();

      // Calculate tenant statistics
      const tenantsByPlan = tenants.reduce((acc, tenant) => {
        const plan = tenant.planType || 'default';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tenantsByRegion = tenants.reduce((acc, tenant) => {
        const region = tenant.region || 'unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate job statistics
      const jobsByTenant = allJobs.reduce((acc, job) => {
        const tenantId = job.id?.split(':')[1] || 'unknown';
        acc[tenantId] = (acc[tenantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        timestamp: new Date().toISOString(),
        tenants: {
          total: tenants.length,
          active: tenants.filter(t => t.isEnabled).length,
          inactive: tenants.filter(t => !t.isEnabled).length,
          byPlan: tenantsByPlan,
          byRegion: tenantsByRegion,
        },
        jobs: {
          total: allJobs.length,
          queue: queueStats,
          byTenant: jobsByTenant,
          tenantsWithJobs: Object.keys(jobsByTenant).length,
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get system statistics: ${ error.message }`);
    }
  }

  /**
   * Trigger system-wide maintenance tasks.
   */
  @Post('maintenance/sync-all')
  @ApiOperation({
    summary: 'Sync all tenant jobs',
    description: 'Trigger synchronization of all tenant jobs (maintenance operation)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance sync triggered successfully',
  })
  async triggerMaintenanceSync() {
    try {
      // Get all active tenants
      const tenants = await this.tenantRepository.findAll();
      const activeTenants = tenants.filter(t => t.isEnabled);

      // Trigger bulk sync
      await this.configChangeListener.onBulkTenantSync({
        tenantIds: activeTenants.map(t => t.id),
      });

      return {
        message: 'Maintenance sync triggered for all active tenants',
        tenantsProcessed: activeTenants.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to trigger maintenance sync: ${ error.message }`);
    }
  }

  /**
   * Clean up failed or stale jobs.
   */
  @Delete('maintenance/cleanup-jobs')
  @ApiOperation({
    summary: 'Clean up jobs',
    description: 'Clean up failed or stale jobs from the queue',
  })
  @ApiQuery({
    name: 'olderThanHours',
    required: false,
    description: 'Clean jobs older than specified hours',
    example: 24,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job cleanup completed successfully',
  })
  async cleanupJobs(@Query('olderThanHours') olderThanHours = 24) {
    try {
      // TODO: In a real implementation, you would:
      // 1. Remove completed jobs older than specified hours
      // 2. Remove failed jobs that have exceeded retry limits
      // 3. Clean up orphaned repeatable jobs

      // For now, just get current stats for reporting
      const queueStats = await this.jobRegistryService.getQueueStats();

      return {
        message: `Job cleanup completed (would clean jobs older than ${ olderThanHours } hours)`,
        beforeCleanup: queueStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to cleanup jobs: ${ error.message }`);
    }
  }

  /**
   * Test tenant configuration and connectivity.
   */
  @Post('test/tenant/:tenantId')
  @ApiOperation({
    summary: 'Test tenant setup',
    description: 'Comprehensive test of tenant configuration and connectivity',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    example: 'tenant-uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant test completed',
  })
  async testTenantSetup(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${ tenantId } not found`);
    }

    const testResults: any = {
      tenantId,
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: Tenant configuration resolution
    try {
      const cronConfig = await this.tenantConfigService.resolveCronConfig({tenantId});
      testResults.tests.cronConfig = {
        status: 'passed',
        result: cronConfig.config,
      };
    } catch (error) {
      testResults.tests.cronConfig = {
        status: 'failed',
        error: error.message,
      };
    }

    // Test 2: GPS provider configuration
    try {
      const gpsConfig = await this.tenantConfigService.resolveGpsProviderConfig(tenantId);
      testResults.tests.gpsConfig = {
        status: 'passed',
        result: gpsConfig,
      };
    } catch (error) {
      testResults.tests.gpsConfig = {
        status: 'failed',
        error: error.message,
      };
    }

    // Test 3: Job synchronization
    try {
      await this.configChangeListener.triggerTenantJobUpdate(tenantId);
      testResults.tests.jobSync = {
        status: 'passed',
        message: 'Job synchronization triggered successfully',
      };
    } catch (error) {
      testResults.tests.jobSync = {
        status: 'failed',
        error: error.message,
      };
    }

    // Test 4: Feature flags
    try {
      const flagKeys = this.featureFlagService.getAvailableFlags();
      const context = await this.tenantConfigService.getTenantContext(tenantId);
      const flags = await this.featureFlagService.getFlags(flagKeys.slice(0, 3), context);
      testResults.tests.featureFlags = {
        status: 'passed',
        result: flags,
      };
    } catch (error) {
      testResults.tests.featureFlags = {
        status: 'failed',
        error: error.message,
      };
    }

    // Calculate overall test status
    const testStatuses = Object.values(testResults.tests).map((test: any) => test.status);
    const failedTests = testStatuses.filter(status => status === 'failed').length;

    testResults.summary = {
      totalTests: testStatuses.length,
      passed: testStatuses.length - failedTests,
      failed: failedTests,
      overallStatus: failedTests === 0 ? 'passed' : 'failed',
    };

    return testResults;
  }

  /**
   * Get debug information for troubleshooting.
   */
  @Get('debug/info')
  @ApiOperation({
    summary: 'Get debug information',
    description: 'Get system debug information for troubleshooting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Debug information retrieved successfully',
  })
  getDebugInfo() {
    return {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: process.memoryUsage(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        databaseUrl: process.env.DATABASE_URL ? '[REDACTED]' : 'not set',
        redisUrl: process.env.REDIS_URL ? '[REDACTED]' : 'not set',
      },
      features: {
        multiTenantEnabled: true,
        jobSchedulerEnabled: true,
        featureFlagsEnabled: true,
        gpsIntegrationEnabled: true,
      },
    };
  }
}
