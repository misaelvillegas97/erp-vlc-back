/**
 * Context passed to processors and services to ensure tenant isolation.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly timezone: string;
  readonly planType?: string;
  readonly region?: string;
}

/**
 * Represents the effective scheduling configuration for a tenant job.
 */
export interface TenantCronConfig {
  readonly tenantId: string;
  readonly jobType: 'gps.sync' | string;
  readonly cron: string; // e.g. "0 */15 * * * *"
  readonly timezone: string; // e.g. "America/Bogota"
  readonly isEnabled: boolean;
}

/**
 * Encapsulates GPS provider configuration for a tenant.
 */
export interface GpsProviderConfig {
  readonly tenantId: string;
  readonly provider: 'providerA' | 'providerB' | string;
  readonly baseUrl: string;
  readonly apiKeySecretRef: string; // reference in Vault/KMS
  readonly isEnabled: boolean;
}

/**
 * Configuration resolution input parameters.
 */
export interface ResolveCronInput {
  readonly tenantId: string;
  readonly userId?: string;
}

/**
 * Configuration resolution output.
 */
export interface ResolveCronOutput {
  readonly config: TenantCronConfig;
}

/**
 * Tenant settings scope enumeration.
 */
export type TenantSettingsScope = 'tenant' | 'user';

/**
 * Job types supported by the scheduler.
 */
export type JobType = 'gps.sync';

/**
 * Input for upserting cron jobs.
 */
export interface UpsertCronJobInput {
  readonly config: TenantCronConfig;
}

/**
 * Tenant creation data.
 */
export interface CreateTenantInput {
  readonly name: string;
  readonly subdomain: string;
  readonly timezone?: string;
  readonly planType?: string;
  readonly region?: string;
  readonly settings?: Record<string, any>;
}

/**
 * Tenant update data.
 */
export interface UpdateTenantInput {
  readonly name?: string;
  readonly subdomain?: string;
  readonly timezone?: string;
  readonly planType?: string;
  readonly region?: string;
  readonly isEnabled?: boolean;
  readonly settings?: Record<string, any>;
}
