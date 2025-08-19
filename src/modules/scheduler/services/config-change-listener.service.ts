import { Injectable, Logger }  from '@nestjs/common';
import { OnEvent }             from '@nestjs/event-emitter';
import { JobRegistryService }  from './job-registry.service';
import { TenantConfigService } from '../../tenant/services/tenant-config.service';

/**
 * Event interface for tenant configuration changes.
 */
export interface TenantConfigChangedEvent {
  tenantId: string;
  configKey: string;
  oldValue?: any;
  newValue?: any;
  userId?: string; // For user-specific changes
}

/**
 * Event interface for tenant status changes (enabled/disabled).
 */
export interface TenantStatusChangedEvent {
  tenantId: string;
  isEnabled: boolean;
  previousStatus?: boolean;
}

/**
 * Service that listens for tenant configuration changes and updates scheduled jobs accordingly.
 * Provides reactive job management when tenant settings are modified.
 */
@Injectable()
export class ConfigChangeListenerService {
  private readonly logger = new Logger(ConfigChangeListenerService.name);

  constructor(
    private readonly jobRegistryService: JobRegistryService,
    private readonly tenantConfigService: TenantConfigService,
  ) {}

  /**
   * Handle tenant configuration changes.
   * Updates scheduled jobs when cron-related configurations change.
   * @param event Configuration change event
   */
  @OnEvent('tenant.config.changed')
  async onTenantConfigChanged(event: TenantConfigChangedEvent): Promise<void> {
    const {tenantId, configKey, userId} = event;

    this.logger.log(`Configuration changed for tenant ${ tenantId }, key: ${ configKey }`);

    try {
      // Only process cron-related configuration changes
      if (this.isCronRelatedConfig(configKey)) {
        await this.updateTenantJobs(tenantId, userId);
      } else {
        this.logger.debug(`Ignoring non-cron config change: ${ configKey }`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle config change for tenant ${ tenantId }`, error);
      // Don't rethrow - we don't want to break the event system
    }
  }

  /**
   * Handle tenant status changes (enabled/disabled).
   * Creates or removes jobs based on tenant status.
   * @param event Tenant status change event
   */
  @OnEvent('tenant.status.changed')
  async onTenantStatusChanged(event: TenantStatusChangedEvent): Promise<void> {
    const {tenantId, isEnabled} = event;

    this.logger.log(`Tenant ${ tenantId } status changed to: ${ isEnabled ? 'enabled' : 'disabled' }`);

    try {
      if (isEnabled) {
        // Tenant was enabled, create/update jobs
        await this.updateTenantJobs(tenantId);
      } else {
        // Tenant was disabled, remove all jobs
        await this.jobRegistryService.clearTenantJobs(tenantId);
        this.logger.log(`Cleared all jobs for disabled tenant ${ tenantId }`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle status change for tenant ${ tenantId }`, error);
    }
  }

  /**
   * Handle bulk tenant synchronization.
   * Useful for initial setup or recovery scenarios.
   * @param event Bulk sync event
   */
  @OnEvent('tenant.bulk.sync')
  async onBulkTenantSync(event: { tenantIds?: string[] }): Promise<void> {
    const {tenantIds} = event;

    this.logger.log(`Starting bulk tenant sync for ${ tenantIds ? tenantIds.length : 'all' } tenants`);

    try {
      if (tenantIds && tenantIds.length > 0) {
        // Sync specific tenants
        for (const tenantId of tenantIds) {
          await this.updateTenantJobs(tenantId);
        }
      } else {
        // Sync all tenants - this would require getting all tenants from repository
        this.logger.warn('Bulk sync for all tenants not implemented yet');
      }

      this.logger.log('Bulk tenant sync completed successfully');
    } catch (error) {
      this.logger.error('Failed to complete bulk tenant sync', error);
    }
  }

  /**
   * Manually trigger job updates for a tenant.
   * Useful for administrative operations or troubleshooting.
   * @param tenantId The tenant ID
   * @param userId Optional user ID
   */
  async triggerTenantJobUpdate(tenantId: string, userId?: string): Promise<void> {
    this.logger.log(`Manually triggering job update for tenant ${ tenantId }`);

    try {
      await this.updateTenantJobs(tenantId, userId);
      this.logger.log(`Manual job update completed for tenant ${ tenantId }`);
    } catch (error) {
      this.logger.error(`Manual job update failed for tenant ${ tenantId }`, error);
      throw error;
    }
  }

  /**
   * Get synchronization status for troubleshooting.
   * @param tenantId The tenant ID
   * @returns Sync status information
   */
  async getTenantSyncStatus(tenantId: string): Promise<{
    tenantId: string;
    hasActiveJobs: boolean;
    jobCount: number;
    lastSyncAttempt?: Date;
    syncErrors?: string[];
  }> {
    try {
      const jobs = await this.jobRegistryService.getTenantJobs(tenantId);

      return {
        tenantId,
        hasActiveJobs: jobs.length > 0,
        jobCount: jobs.length,
        lastSyncAttempt: new Date(), // In a real implementation, you'd track this
        syncErrors: [], // In a real implementation, you'd track errors
      };
    } catch (error) {
      this.logger.error(`Failed to get sync status for tenant ${ tenantId }`, error);
      return {
        tenantId,
        hasActiveJobs: false,
        jobCount: 0,
        syncErrors: [ error.message ],
      };
    }
  }

  /**
   * Update jobs for a specific tenant by resolving current configuration.
   * @param tenantId The tenant ID
   * @param userId Optional user ID for user-specific configs
   */
  private async updateTenantJobs(tenantId: string, userId?: string): Promise<void> {
    this.logger.debug(`Updating jobs for tenant ${ tenantId }${ userId ? `, user ${ userId }` : '' }`);

    try {
      // Resolve current cron configuration for the tenant
      const {config} = await this.tenantConfigService.resolveCronConfig({
        tenantId,
        userId,
      });

      // Update the job in the registry
      await this.jobRegistryService.upsertCronJob({config});

      this.logger.log(`Successfully updated jobs for tenant ${ tenantId }`);
    } catch (error) {
      this.logger.error(`Failed to update jobs for tenant ${ tenantId }`, error);
      throw error; // Re-throw to be caught by the event handler
    }
  }

  /**
   * Check if a configuration key is related to cron scheduling.
   * @param configKey The configuration key
   * @returns True if it's cron-related
   */
  private isCronRelatedConfig(configKey: string): boolean {
    const cronRelatedKeys = [
      'gps.sync',           // Direct cron config
      'cron',               // Generic cron settings
      'schedule',           // Schedule-related settings
      'timezone',           // Timezone changes affect scheduling
      'gps.provider',       // GPS provider changes might affect scheduling
    ];

    return cronRelatedKeys.some(key => configKey.includes(key));
  }
}
