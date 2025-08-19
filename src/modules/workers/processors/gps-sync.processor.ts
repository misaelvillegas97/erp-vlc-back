import { Processor, WorkerHost }            from '@nestjs/bullmq';
import { Job }                              from 'bullmq';
import { Injectable, Logger }               from '@nestjs/common';
import { TenantConfigService }              from '../../tenant/services/tenant-config.service';
import { TenantService }                    from '../../tenant/services/tenant.service';
import { GpsProviderConfig, TenantContext } from '../../tenant/domain/interfaces/tenant.interfaces';
import { GpsProviderFactoryService }        from '../../gps/services/gps-provider-factory.service';

/**
 * Job data interface for GPS sync processing.
 */
interface GpsSyncJobData {
  tenantId: string;
  jobType: string;
  timezone: string;
}

/**
 * GPS sync result interface.
 */
interface GpsSyncResult {
  tenantId: string;
  processedVehicles: number;
  successfulSyncs: number;
  failedSyncs: number;
  processingTimeMs: number;
  errors?: string[];
}

/**
 * Processor for handling GPS sync jobs per tenant.
 * Ensures tenant isolation and proper context management.
 */
@Processor('gps-queue')
@Injectable()
export class GpsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GpsSyncProcessor.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantConfigService: TenantConfigService,
    private readonly gpsProviderFactory: GpsProviderFactoryService,
  ) {
    super();
  }

  /**
   * Process GPS sync job for a specific tenant.
   * @param job The BullMQ job containing tenant context
   * @returns Processing result
   */
  async process(job: Job<GpsSyncJobData>): Promise<GpsSyncResult> {
    const {tenantId, jobType} = job.data;
    const startTime = Date.now();

    this.logger.log(`Starting GPS sync job for tenant ${ tenantId }, job type: ${ jobType }`);

    try {
      // Set up tenant context for this job
      const tenantContext = await this.resolveTenantContext(tenantId);

      return await this.tenantService.runWithTenantContext(tenantContext, async () => {
        // Resolve GPS provider configuration for this tenant
        const gpsConfig = await this.resolveGpsConfig(tenantId);

        if (!gpsConfig.isEnabled) {
          this.logger.log(`GPS sync is disabled for tenant ${ tenantId }`);
          return this.createSyncResult(tenantId, startTime, 0, 0, 0);
        }

        // Execute the GPS sync with tenant-specific configuration
        const result = await this.executeGpsSync({
          tenantContext,
          gpsConfig,
        });

        this.logger.log(
          `GPS sync completed for tenant ${ tenantId }. ` +
          `Processed: ${ result.processedVehicles }, ` +
          `Successful: ${ result.successfulSyncs }, ` +
          `Failed: ${ result.failedSyncs }, ` +
          `Duration: ${ result.processingTimeMs }ms`
        );

        return result;
      });
    } catch (error) {
      this.logger.error(`GPS sync failed for tenant ${ tenantId }`, error);
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  }

  /**
   * Resolve tenant context from tenant ID.
   * @param tenantId The tenant ID
   * @returns Tenant context
   */
  private async resolveTenantContext(tenantId: string): Promise<TenantContext> {
    try {
      return await this.tenantConfigService.getTenantContext(tenantId);
    } catch (error) {
      this.logger.error(`Failed to resolve tenant context for ${ tenantId }`, error);
      throw new Error(`Invalid or disabled tenant: ${ tenantId }`);
    }
  }

  /**
   * Resolve GPS provider configuration for tenant.
   * @param tenantId The tenant ID
   * @returns GPS provider configuration
   */
  private async resolveGpsConfig(tenantId: string): Promise<GpsProviderConfig> {
    try {
      return await this.tenantConfigService.resolveGpsProviderConfig(tenantId);
    } catch (error) {
      this.logger.error(`Failed to resolve GPS config for tenant ${ tenantId }`, error);
      throw new Error(`GPS configuration not found for tenant: ${ tenantId }`);
    }
  }

  /**
   * Execute the actual GPS sync operation.
   * @param params Sync parameters
   * @returns Sync result
   */
  private async executeGpsSync(params: {
    tenantContext: TenantContext;
    gpsConfig: GpsProviderConfig;
  }): Promise<GpsSyncResult> {
    const {tenantContext, gpsConfig} = params;
    const {tenantId} = tenantContext;
    const startTime = Date.now();

    try {
      // TODO: Implement actual GPS sync logic with existing factory
      // This is where you would:
      // 1. Fetch vehicles for this tenant from the database
      // 2. Use gpsProviderFactory.getProviderForVehicle() for each vehicle
      // 3. Get GPS data from the provider
      // 4. Update vehicle positions in the database
      // 5. Handle errors and retries per vehicle

      this.logger.debug(`Processing GPS sync with provider ${ gpsConfig.provider } for tenant ${ tenantId }`);

      // For now, simulate the sync operation to demonstrate tenant-aware scheduling
      // In a real implementation, you would use the existing factory:
      // const vehicles = await this.getVehiclesForTenant(tenantId);
      // for (const vehicle of vehicles) {
      //   const { provider } = await this.gpsProviderFactory.getProviderForVehicle(vehicle.id);
      //   const gpsData = await provider.getVehiclePosition(vehicle.gpsId);
      //   await this.updateVehiclePosition(vehicle, gpsData);
      // }

      const processedVehicles = await this.simulateVehicleSync(tenantId);

      return this.createSyncResult(
        tenantId,
        startTime,
        processedVehicles,
        processedVehicles, // All successful for simulation
        0
      );
    } catch (error) {
      this.logger.error(`GPS sync execution failed for tenant ${ tenantId }`, error);
      throw error;
    }
  }

  /**
   * Simulate vehicle sync operation.
   * TODO: Replace with actual GPS sync implementation.
   * @param _tenantId The tenant ID (unused in simulation)
   * @returns Number of processed vehicles
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async simulateVehicleSync(_tenantId: string): Promise<number> {
    // Simulate processing delay
    await this.delay(1000);

    // TODO: Replace with actual logic:
    // const vehicles = await this.vehicleRepository.findByTenantId(_tenantId);
    // for (const vehicle of vehicles) {
    //   try {
    //     const gpsData = await _gpsProvider.getVehiclePosition(vehicle.gpsId);
    //     await this.updateVehiclePosition(vehicle, gpsData);
    //     successfulSyncs++;
    //   } catch (error) {
    //     this.logger.warn(`Failed to sync vehicle ${vehicle.id}`, error);
    //     failedSyncs++;
    //   }
    // }

    // Return simulated count
    return Math.floor(Math.random() * 10) + 1;
  }

  /**
   * Create a sync result object.
   * @param tenantId The tenant ID
   * @param startTime The start time
   * @param processed Number of processed vehicles
   * @param successful Number of successful syncs
   * @param failed Number of failed syncs
   * @param errors Optional error messages
   * @returns Sync result
   */
  private createSyncResult(
    tenantId: string,
    startTime: number,
    processed: number,
    successful: number,
    failed: number,
    errors?: string[]
  ): GpsSyncResult {
    return {
      tenantId,
      processedVehicles: processed,
      successfulSyncs: successful,
      failedSyncs: failed,
      processingTimeMs: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Utility method to add delays in async operations.
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
