import { Module }             from '@nestjs/common';
import { AdminController }    from './controllers/admin.controller';
import { TenantModule }       from '../tenant/tenant.module';
import { SchedulerModule }    from '../scheduler/scheduler.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

/**
 * Module for administrative and debugging operations.
 * Provides comprehensive endpoints for system monitoring, troubleshooting, and maintenance.
 */
@Module({
  imports: [
    // Import TenantModule for tenant management services
    TenantModule,
    // Import SchedulerModule for job management services
    SchedulerModule,
    // Import FeatureFlagsModule for feature flag services
    FeatureFlagsModule,
  ],
  controllers: [
    AdminController,
  ],
  exports: [
    // No exports needed - this module provides admin endpoints only
  ],
})
export class AdminModule {}
