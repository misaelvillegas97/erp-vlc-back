import { Module }                   from '@nestjs/common';
import { TenantFeatureFlagService } from './services/tenant-feature-flag.service';
import { TenantModule }             from '../tenant/tenant.module';
import { ConfigModule }             from '../config/config.module';

/**
 * Module for managing tenant-aware feature flags.
 * Provides hierarchical flag resolution and integrates with existing feature toggles.
 */
@Module({
  imports: [
    // Import TenantModule for tenant context and repository services
    TenantModule,
    // Import ConfigModule for existing feature toggle registry integration
    ConfigModule,
  ],
  providers: [
    TenantFeatureFlagService,
  ],
  exports: [
    TenantFeatureFlagService,
  ],
})
export class FeatureFlagsModule {}
