import { Injectable, Logger, OnModuleInit }     from '@nestjs/common';
import { InjectQueue }                          from '@nestjs/bullmq';
import { JobsOptions, Queue, RepeatableJob }    from 'bullmq';
import { TenantCronConfig, UpsertCronJobInput } from '../../tenant/domain/interfaces/tenant.interfaces';

/**
 * Service for creating/updating repeatable jobs for each tenant with idempotency.
 * Uses BullMQ to manage tenant-specific cron jobs and prevents job duplication.
 */
@Injectable()
export class JobRegistryService implements OnModuleInit {
  private readonly logger = new Logger(JobRegistryService.name);

  constructor(
    @InjectQueue('gps-queue') private readonly gpsQueue: Queue,
  ) {}

  onModuleInit(): void {
    this.logger.log('JobRegistryService initialized');
  }

  /**
   * Create or update a repeatable cron job for a tenant.
   * Implements idempotent job creation to prevent duplicates.
   * @param input Job configuration input
   */
  async upsertCronJob(input: UpsertCronJobInput): Promise<void> {
    const {config} = input;
    const jobId = this.buildJobId(config);

    this.logger.log(`Upserting cron job ${ jobId } for tenant ${ config.tenantId }`);

    try {
      // Remove any existing repeatable jobs with the same jobId to ensure idempotency
      await this.removeExistingRepeatableJob(jobId);

      // Skip creating job if it's disabled
      if (!config.isEnabled) {
        this.logger.log(`Skipping disabled job ${ jobId } for tenant ${ config.tenantId }`);
        return;
      }

      // Validate cron configuration before creating job
      this.validateCronConfig(config);

      // Create the repeatable job
      const repeat: JobsOptions['repeat'] = {
        pattern: config.cron,
        tz: config.timezone,
      };

      const jobOptions: JobsOptions = {
        jobId,
        repeat,
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs for debugging
        attempts: 3,          // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      };

      const jobData = {
        tenantId: config.tenantId,
        jobType: config.jobType,
        timezone: config.timezone,
      };

      await this.gpsQueue.add(config.jobType, jobData, jobOptions);

      this.logger.log(`Successfully created repeatable job ${ jobId } for tenant ${ config.tenantId }`);
      this.logger.debug(`Job details: cron=${ config.cron }, timezone=${ config.timezone }`);

    } catch (error) {
      this.logger.error(`Failed to upsert cron job ${ jobId } for tenant ${ config.tenantId }`, error);
      throw error;
    }
  }

  /**
   * Remove a cron job for a tenant.
   * @param config Job configuration
   */
  async removeCronJob(config: TenantCronConfig): Promise<void> {
    const jobId = this.buildJobId(config);

    this.logger.log(`Removing cron job ${ jobId } for tenant ${ config.tenantId }`);

    try {
      await this.removeExistingRepeatableJob(jobId);
      this.logger.log(`Successfully removed job ${ jobId } for tenant ${ config.tenantId }`);
    } catch (error) {
      this.logger.error(`Failed to remove cron job ${ jobId } for tenant ${ config.tenantId }`, error);
      throw error;
    }
  }

  /**
   * Get all repeatable jobs for a specific tenant.
   * @param tenantId The tenant ID
   * @returns Array of repeatable jobs for the tenant
   */
  async getTenantJobs(tenantId: string): Promise<RepeatableJob[]> {
    try {
      const allRepeatableJobs = await this.gpsQueue.getRepeatableJobs();

      // Filter jobs for the specific tenant
      return allRepeatableJobs.filter(job => {
        const jobIdParts = job.id?.split(':');
        return jobIdParts && jobIdParts.length >= 2 && jobIdParts[1] === tenantId;
      });
    } catch (error) {
      this.logger.error(`Failed to get jobs for tenant ${ tenantId }`, error);
      throw error;
    }
  }

  /**
   * Get all repeatable jobs across all tenants.
   * @returns Array of all repeatable jobs
   */
  async getAllJobs(): Promise<RepeatableJob[]> {
    try {
      return await this.gpsQueue.getRepeatableJobs();
    } catch (error) {
      this.logger.error('Failed to get all repeatable jobs', error);
      throw error;
    }
  }

  /**
   * Get queue statistics for monitoring.
   * @returns Queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    repeatableJobs: number;
  }> {
    try {
      const [ waiting, active, completed, failed, delayed, repeatableJobs ] = await Promise.all([
        this.gpsQueue.getWaiting(),
        this.gpsQueue.getActive(),
        this.gpsQueue.getCompleted(),
        this.gpsQueue.getFailed(),
        this.gpsQueue.getDelayed(),
        this.gpsQueue.getRepeatableJobs(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        repeatableJobs: repeatableJobs.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue statistics', error);
      throw error;
    }
  }

  /**
   * Clear all jobs for a tenant (use with caution).
   * @param tenantId The tenant ID
   */
  async clearTenantJobs(tenantId: string): Promise<void> {
    this.logger.warn(`Clearing all jobs for tenant ${ tenantId }`);

    try {
      const tenantJobs = await this.getTenantJobs(tenantId);

      for (const job of tenantJobs) {
        if (job.key) {
          await this.gpsQueue.removeRepeatableByKey(job.key);
          this.logger.debug(`Removed job with key: ${ job.key }`);
        }
      }

      this.logger.log(`Cleared ${ tenantJobs.length } jobs for tenant ${ tenantId }`);
    } catch (error) {
      this.logger.error(`Failed to clear jobs for tenant ${ tenantId }`, error);
      throw error;
    }
  }

  /**
   * Build a stable job ID for a tenant job configuration.
   * Format: {jobType}:{tenantId}
   * @param config Job configuration
   * @returns Stable job ID
   */
  private buildJobId(config: TenantCronConfig): string {
    return `${ config.jobType }:${ config.tenantId }`;
  }

  /**
   * Remove existing repeatable jobs with the same job ID.
   * Ensures idempotent job creation.
   * @param jobId The job ID to remove
   */
  private async removeExistingRepeatableJob(jobId: string): Promise<void> {
    try {
      const existingJobs = await this.gpsQueue.getRepeatableJobs();

      // Find jobs with matching ID
      const jobsToRemove = existingJobs.filter(job => job.id === jobId);

      if (jobsToRemove.length > 0) {
        this.logger.debug(`Found ${ jobsToRemove.length } existing jobs with ID ${ jobId }, removing them`);

        // Remove each matching job using its key
        for (const job of jobsToRemove) {
          if (job.key) {
            await this.gpsQueue.removeRepeatableByKey(job.key);
            this.logger.debug(`Removed existing repeatable job with key: ${ job.key }`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to remove existing repeatable jobs for ID ${ jobId }`, error);
      // Don't throw here, as this is cleanup - we still want to create the new job
    }
  }

  /**
   * Validate cron configuration before job creation.
   * @param config Cron configuration to validate
   */
  private validateCronConfig(config: TenantCronConfig): void {
    if (!config.cron) {
      throw new Error('Cron expression is required');
    }

    if (!config.timezone) {
      throw new Error('Timezone is required');
    }

    if (!config.tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!config.jobType) {
      throw new Error('Job type is required');
    }
  }
}
