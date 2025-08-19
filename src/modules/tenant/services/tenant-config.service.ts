import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantRepository }                from '../repositories/tenant.repository';
import {
  GpsProviderConfig,
  ResolveCronInput,
  ResolveCronOutput,
  TenantContext,
  TenantCronConfig
}                                          from '../domain/interfaces/tenant.interfaces';
import * as cronValidator                  from 'cron-validator';
import { parseExpression }                 from 'cron-parser';

/**
 * Default configurations that serve as base values.
 */
const DEFAULT_CONFIGS = {
  'gps.sync': {
    cron: '0 */30 * * * *', // Every 30 minutes
    timezone: 'UTC',
    isEnabled: true,
  },
} as const;

/**
 * Plan-based configuration overrides.
 */
const PLAN_CONFIGS: Record<string, Record<string, any>> = {
  'premium': {
    'gps.sync': {
      cron: '0 */15 * * * *', // Every 15 minutes for premium
    },
  },
  'enterprise': {
    'gps.sync': {
      cron: '0 */5 * * * *', // Every 5 minutes for enterprise
    },
  },
};

/**
 * Service for resolving effective configuration combining defaults, plan, tenant and user overrides.
 * Implements hierarchical configuration resolution: defaults → plan → tenant → user
 */
@Injectable()
export class TenantConfigService {
  constructor(
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Resolve effective cron configuration for a tenant job.
   * @param input Configuration resolution parameters
   * @returns Resolved configuration with validation
   */
  async resolveCronConfig(input: ResolveCronInput): Promise<ResolveCronOutput> {
    const {tenantId, userId} = input;

    // Get tenant information
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException(`Tenant ${ tenantId } not found or disabled`);
    }

    // Start with defaults
    const defaults: Partial<TenantCronConfig> = {
      tenantId,
      jobType: 'gps.sync',
      ...DEFAULT_CONFIGS['gps.sync'],
    };

    // Apply plan-based overrides
    const planOverride = this.getPlanConfig(tenant.planType, 'gps.sync');

    // Get tenant-specific settings
    const tenantOverride = await this.getTenantConfig(tenantId, 'gps.sync');

    // Get user-specific settings if userId provided
    const userOverride = userId
      ? await this.getUserConfig(tenantId, userId, 'gps.sync')
      : null;

    // Merge configurations in hierarchy order
    const merged = this.mergeConfigs([
      defaults,
      planOverride,
      {timezone: tenant.timezone}, // Use tenant's timezone
      tenantOverride,
      userOverride,
    ].filter(Boolean));

    // Validate the final configuration
    const config = this.validateCronConfig(merged as TenantCronConfig);

    return {config};
  }

  /**
   * Resolve GPS provider configuration for a tenant.
   * @param tenantId The tenant ID
   * @returns GPS provider configuration
   */
  async resolveGpsProviderConfig(tenantId: string): Promise<GpsProviderConfig> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException(`Tenant ${ tenantId } not found or disabled`);
    }

    // Get GPS provider settings
    const providerSetting = await this.tenantRepository.getTenantSetting(
      tenantId,
      'gps.provider',
      'tenant',
    );

    const credentialsSetting = await this.tenantRepository.getTenantSetting(
      tenantId,
      'gps.credentials',
      'tenant',
    );

    // Default configuration
    const config: GpsProviderConfig = {
      tenantId,
      provider: providerSetting?.value?.provider ?? 'providerA',
      baseUrl: providerSetting?.value?.baseUrl ?? 'https://api.default-provider.com',
      apiKeySecretRef: credentialsSetting?.value?.secretRef ?? `secret:gps:${ tenantId }`,
      isEnabled: providerSetting?.value?.isEnabled ?? true,
    };

    return config;
  }

  /**
   * Update tenant configuration setting.
   * @param tenantId The tenant ID
   * @param key The setting key
   * @param value The setting value
   * @param userId Optional user ID for user-scoped settings
   * @param description Optional description
   * @returns The updated setting
   */
  async updateTenantConfig(
    tenantId: string,
    key: string,
    value: Record<string, any>,
    userId?: string,
    description?: string,
  ): Promise<void> {
    const scope = userId ? 'user' : 'tenant';

    // Validate the configuration if it's a cron config
    if (key === 'gps.sync' && value.cron) {
      const testConfig: TenantCronConfig = {
        tenantId,
        jobType: 'gps.sync',
        cron: value.cron,
        timezone: value.timezone || 'UTC',
        isEnabled: value.isEnabled ?? true,
      };
      this.validateCronConfig(testConfig);
    }

    await this.tenantRepository.upsertTenantSetting(
      tenantId,
      key,
      value,
      scope,
      userId,
      description,
    );
  }

  /**
   * Get tenant context for a given tenant ID.
   * @param tenantId The tenant ID
   * @returns Tenant context
   */
  async getTenantContext(tenantId: string): Promise<TenantContext> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException(`Tenant ${ tenantId } not found or disabled`);
    }

    return {
      tenantId: tenant.id,
      timezone: tenant.timezone,
      planType: tenant.planType ?? undefined,
      region: tenant.region ?? undefined,
    };
  }

  /**
   * Get plan-based configuration overrides.
   * @param planType The plan type
   * @param configKey The configuration key
   * @returns Plan configuration or null
   */
  private getPlanConfig(planType: string | null, configKey: string): Record<string, any> | null {
    if (!planType || !PLAN_CONFIGS[planType]) {
      return null;
    }

    return PLAN_CONFIGS[planType][configKey] || null;
  }

  /**
   * Get tenant-specific configuration.
   * @param tenantId The tenant ID
   * @param configKey The configuration key
   * @returns Tenant configuration or null
   */
  private async getTenantConfig(tenantId: string, configKey: string): Promise<Record<string, any> | null> {
    const setting = await this.tenantRepository.getTenantSetting(tenantId, configKey, 'tenant');
    return setting?.value || null;
  }

  /**
   * Get user-specific configuration.
   * @param tenantId The tenant ID
   * @param userId The user ID
   * @param configKey The configuration key
   * @returns User configuration or null
   */
  private async getUserConfig(
    tenantId: string,
    userId: string,
    configKey: string,
  ): Promise<Record<string, any> | null> {
    const setting = await this.tenantRepository.getTenantSetting(tenantId, configKey, 'user', userId);
    return setting?.value || null;
  }

  /**
   * Merge multiple configuration objects in hierarchy order.
   * Later configurations override earlier ones.
   * @param configs Array of configuration objects
   * @returns Merged configuration
   */
  private mergeConfigs(configs: Array<Record<string, any>>): Record<string, any> {
    return configs.reduce((acc, curr) => {
      if (!curr) return acc;

      return {
        ...acc,
        ...curr,
      };
    }, {});
  }

  /**
   * Validate cron configuration.
   * @param config The configuration to validate
   * @returns Validated configuration
   * @throws BadRequestException if validation fails
   */
  private validateCronConfig(config: TenantCronConfig): TenantCronConfig {
    // Validate cron expression
    if (!cronValidator.isValidCron(config.cron)) {
      throw new BadRequestException(`Invalid cron expression: ${ config.cron }`);
    }

    // Validate timezone
    if (!this.isValidTimezone(config.timezone)) {
      throw new BadRequestException(`Invalid timezone: ${ config.timezone }`);
    }

    // Parse cron expression to validate it can be scheduled
    try {
      parseExpression(config.cron, {
        tz: config.timezone,
      });
    } catch (error) {
      throw new BadRequestException(`Unable to parse cron expression "${ config.cron }" with timezone "${ config.timezone }": ${ error.message }`);
    }

    // Validate minimum interval (prevent too frequent executions)
    const minIntervalSeconds = this.getMinimumIntervalFromCron(config.cron);
    if (minIntervalSeconds < 60) { // Minimum 1 minute
      throw new BadRequestException('Cron expression interval must be at least 1 minute');
    }

    return config;
  }

  /**
   * Validate if a timezone is valid.
   * @param timezone The timezone to validate
   * @returns True if valid, false otherwise
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      // Try to create a date with the timezone
      new Intl.DateTimeFormat('en', {timeZone: timezone}).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get minimum interval in seconds from cron expression.
   * @param cronExpression The cron expression
   * @returns Minimum interval in seconds
   */
  private getMinimumIntervalFromCron(cronExpression: string): number {
    try {
      const interval = parseExpression(cronExpression);
      const next = interval.next().toDate();
      const nextNext = interval.next().toDate();

      return (nextNext.getTime() - next.getTime()) / 1000;
    } catch {
      // If we can't parse, assume it's valid (other validation will catch issues)
      return 60;
    }
  }
}
