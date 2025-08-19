import { Injectable, Logger }           from '@nestjs/common';
import { TenantRepository }             from '../../tenant/repositories/tenant.repository';
import { TenantService }                from '../../tenant/services/tenant.service';
import { FeatureToggleRegistryService } from '../../config/feature-toggle-registry.service';

/**
 * Feature flag evaluation context for tenant-aware flags.
 */
export interface FeatureFlagContext {
  readonly tenantId: string;
  readonly userId?: string;
  readonly planType?: string;
  readonly region?: string;
  readonly userRoles?: string[];
}

/**
 * Feature flag configuration with metadata.
 */
export interface FeatureFlag {
  readonly key: string;
  readonly enabled: boolean;
  readonly source: 'default' | 'plan' | 'tenant' | 'user';
  readonly metadata?: Record<string, any>;
}

/**
 * Default feature flag configurations.
 */
const DEFAULT_FLAGS: Record<string, boolean> = {
  'gps.sync.enabled': true,
  'gps.sync.batch-processing': false,
  'gps.sync.real-time': false,
  'gps.provider.failover': true,
  'gps.provider.load-balancing': false,
  'tenant.multi-region': false,
  'tenant.advanced-scheduling': false,
  'analytics.real-time': false,
  'analytics.historical': true,
  'notifications.email': true,
  'notifications.sms': false,
  'notifications.push': true,
};

/**
 * Plan-based feature flag overrides.
 */
const PLAN_FLAGS: Record<string, Record<string, boolean>> = {
  'premium': {
    'gps.sync.batch-processing': true,
    'gps.provider.load-balancing': true,
    'analytics.real-time': true,
    'notifications.sms': true,
  },
  'enterprise': {
    'gps.sync.batch-processing': true,
    'gps.sync.real-time': true,
    'gps.provider.load-balancing': true,
    'tenant.multi-region': true,
    'tenant.advanced-scheduling': true,
    'analytics.real-time': true,
    'analytics.historical': true,
    'notifications.sms': true,
  },
};

/**
 * Service for managing tenant-aware feature flags with hierarchical resolution.
 * Integrates with existing feature toggles infrastructure and provides tenant context.
 */
@Injectable()
export class TenantFeatureFlagService {
  private readonly logger = new Logger(TenantFeatureFlagService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantService: TenantService,
    private readonly featureToggleRegistry: FeatureToggleRegistryService,
  ) {}

  /**
   * Evaluate a feature flag for the current tenant context.
   * @param flagKey The feature flag key
   * @returns Whether the flag is enabled
   */
  async isEnabled(flagKey: string): Promise<boolean> {
    const context = await this.getCurrentContext();
    return this.isEnabledForContext(flagKey, context);
  }

  /**
   * Evaluate a feature flag for a specific context.
   * @param flagKey The feature flag key
   * @param context The evaluation context
   * @returns Whether the flag is enabled
   */
  async isEnabledForContext(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    const flag = await this.getFlag(flagKey, context);
    return flag.enabled;
  }

  /**
   * Get detailed feature flag information including source and metadata.
   * @param flagKey The feature flag key
   * @param context Optional context (uses current if not provided)
   * @returns Feature flag details
   */
  async getFlag(flagKey: string, context?: FeatureFlagContext): Promise<FeatureFlag> {
    const evalContext = context || await this.getCurrentContext();

    try {
      // Start with default value
      let enabled = DEFAULT_FLAGS[flagKey] ?? false;
      let source: FeatureFlag['source'] = 'default';
      const metadata: Record<string, any> = {};

      // Apply plan-based overrides
      if (evalContext.planType && PLAN_FLAGS[evalContext.planType]?.[flagKey] !== undefined) {
        enabled = PLAN_FLAGS[evalContext.planType][flagKey];
        source = 'plan';
        metadata.planType = evalContext.planType;
      }

      // Apply tenant-specific overrides
      const tenantFlag = await this.getTenantFlag(evalContext.tenantId, flagKey);
      if (tenantFlag !== null) {
        enabled = tenantFlag;
        source = 'tenant';
        metadata.tenantId = evalContext.tenantId;
      }

      // Apply user-specific overrides
      if (evalContext.userId) {
        const userFlag = await this.getUserFlag(evalContext.tenantId, evalContext.userId, flagKey);
        if (userFlag !== null) {
          enabled = userFlag;
          source = 'user';
          metadata.userId = evalContext.userId;
        }
      }

      return {
        key: flagKey,
        enabled,
        source,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to evaluate feature flag ${ flagKey }`, error);

      // Fall back to default value on error
      return {
        key: flagKey,
        enabled: DEFAULT_FLAGS[flagKey] ?? false,
        source: 'default',
        metadata: {error: error.message},
      };
    }
  }

  /**
   * Get multiple feature flags at once for efficiency.
   * @param flagKeys Array of feature flag keys
   * @param context Optional context (uses current if not provided)
   * @returns Map of flag keys to flag details
   */
  async getFlags(flagKeys: string[], context?: FeatureFlagContext): Promise<Record<string, FeatureFlag>> {
    const evalContext = context || await this.getCurrentContext();
    const flags: Record<string, FeatureFlag> = {};

    await Promise.all(
      flagKeys.map(async (key) => {
        flags[key] = await this.getFlag(key, evalContext);
      })
    );

    return flags;
  }

  /**
   * Set a tenant-specific feature flag.
   * @param tenantId The tenant ID
   * @param flagKey The feature flag key
   * @param enabled Whether the flag should be enabled
   * @param description Optional description
   */
  async setTenantFlag(
    tenantId: string,
    flagKey: string,
    enabled: boolean,
    description?: string,
  ): Promise<void> {
    await this.tenantRepository.upsertTenantSetting(
      tenantId,
      `feature-flag.${ flagKey }`,
      {enabled},
      'tenant',
      undefined,
      description,
    );

    this.logger.log(`Set tenant flag ${ flagKey }=${ enabled } for tenant ${ tenantId }`);
  }

  /**
   * Set a user-specific feature flag.
   * @param tenantId The tenant ID
   * @param userId The user ID
   * @param flagKey The feature flag key
   * @param enabled Whether the flag should be enabled
   * @param description Optional description
   */
  async setUserFlag(
    tenantId: string,
    userId: string,
    flagKey: string,
    enabled: boolean,
    description?: string,
  ): Promise<void> {
    await this.tenantRepository.upsertTenantSetting(
      tenantId,
      `feature-flag.${ flagKey }`,
      {enabled},
      'user',
      userId,
      description,
    );

    this.logger.log(`Set user flag ${ flagKey }=${ enabled } for user ${ userId } in tenant ${ tenantId }`);
  }

  /**
   * Get all available feature flag keys.
   * @returns Array of feature flag keys
   */
  getAvailableFlags(): string[] {
    return Object.keys(DEFAULT_FLAGS);
  }

  /**
   * Get feature flags for a specific plan type.
   * @param planType The plan type
   * @returns Map of flag keys to enabled status
   */
  getPlanFlags(planType: string): Record<string, boolean> {
    return PLAN_FLAGS[planType] || {};
  }

  /**
   * Get current evaluation context from tenant service.
   * @returns Feature flag context
   */
  private getCurrentContext(): FeatureFlagContext {
    const tenantContext = this.tenantService.getCurrentTenantContext();

    if (!tenantContext) {
      throw new Error('No tenant context available for feature flag evaluation');
    }

    return {
      tenantId: tenantContext.tenantId,
      planType: tenantContext.planType,
      region: tenantContext.region,
      // TODO: Add userId and userRoles from current user context when available
    };
  }

  /**
   * Get tenant-specific feature flag value.
   * @param tenantId The tenant ID
   * @param flagKey The feature flag key
   * @returns Flag value or null if not set
   */
  private async getTenantFlag(tenantId: string, flagKey: string): Promise<boolean | null> {
    const setting = await this.tenantRepository.getTenantSetting(
      tenantId,
      `feature-flag.${ flagKey }`,
      'tenant',
    );

    return setting?.value?.enabled ?? null;
  }

  /**
   * Get user-specific feature flag value.
   * @param tenantId The tenant ID
   * @param userId The user ID
   * @param flagKey The feature flag key
   * @returns Flag value or null if not set
   */
  private async getUserFlag(tenantId: string, userId: string, flagKey: string): Promise<boolean | null> {
    const setting = await this.tenantRepository.getTenantSetting(
      tenantId,
      `feature-flag.${ flagKey }`,
      'user',
      userId,
    );

    return setting?.value?.enabled ?? null;
  }
}
