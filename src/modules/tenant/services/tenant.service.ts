import { Injectable }        from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext }     from '../domain/interfaces/tenant.interfaces';

interface TenantContextStore {
  tenantId: string | null;
  timezone: string | null;
  planType: string | null;
  region: string | null;
  roleId: string | null;
  role: string | null;
}

/**
 * Service for managing tenant context using AsyncLocalStorage.
 * Provides tenant isolation throughout the request lifecycle.
 */
@Injectable()
export class TenantService {
  private readonly asyncLocalStorage: AsyncLocalStorage<TenantContextStore>;

  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<TenantContextStore>();
    // Initialize the tenant context from the request
    void this.initializeTenantContext();
  }

  /**
   * Get the current tenant ID
   * @returns The current tenant ID or null if no tenant is set
   */
  getCurrentTenantId(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.tenantId ?? null;
  }

  /**
   * Set the current tenant ID
   * @param tenantId The tenant ID to set
   */
  setCurrentTenantId(tenantId: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  /**
   * Clear the current tenant ID and role
   */
  clearCurrentTenantId(): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.tenantId = null;
      store.timezone = null;
      store.planType = null;
      store.region = null;
      store.roleId = null;
      store.role = null;
    }
  }

  /**
   * Get the current role ID in the tenant context
   */
  getCurrentRoleId(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.roleId ?? null;
  }

  /**
   * Get the current role in the tenant context
   */
  getCurrentRole(): string | null {
    const store = this.asyncLocalStorage.getStore();
    return store?.role ?? null;
  }

  /**
   * Set the current role in the tenant context
   * @param roleId The role ID to set
   * @param role The role name to set
   */
  setCurrentRole(roleId: string, role: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.roleId = roleId;
      store.role = role;
    }
  }

  /**
   * Clear the current role in the tenant context
   */
  clearCurrentRole(): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.roleId = null;
      store.role = null;
    }
  }

  /**
   * Run a function with a specific tenant context
   * @param tenantId The tenant ID to use
   * @param timezone The timezone for the tenant
   * @param callback The function to execute
   */
  runWithTenant<T>(tenantId: string, timezone: string, callback: () => T): T {
    const store: TenantContextStore = {
      tenantId,
      timezone,
      planType: null,
      region: null,
      roleId: null,
      role: null,
    };
    return this.asyncLocalStorage.run(store, callback);
  }

  /**
   * Run a function with a complete tenant context
   * @param context The tenant context to use
   * @param callback The function to execute
   */
  runWithTenantContext<T>(context: TenantContext, callback: () => T): T {
    const store: TenantContextStore = {
      tenantId: context.tenantId,
      timezone: context.timezone,
      planType: context.planType ?? null,
      region: context.region ?? null,
      roleId: null,
      role: null,
    };
    return this.asyncLocalStorage.run(store, callback);
  }

  /**
   * Get the current tenant context
   * @returns The current tenant context or null if no tenant is set
   */
  getCurrentTenantContext(): TenantContext | null {
    const store = this.asyncLocalStorage.getStore();
    if (!store?.tenantId || !store?.timezone) {
      return null;
    }

    return {
      tenantId: store.tenantId,
      timezone: store.timezone,
      planType: store.planType ?? undefined,
      region: store.region ?? undefined,
    };
  }

  /**
   * Set the full tenant context
   * @param context The tenant context to set
   */
  setTenantContext(context: TenantContext): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.tenantId = context.tenantId;
      store.timezone = context.timezone;
      store.planType = context.planType ?? null;
      store.region = context.region ?? null;
    }
  }

  /**
   * Initialize the async local storage for a new request
   * @param callback The function to execute with the new context
   */
  runWithEmptyContext<T>(callback: () => T): T {
    const store: TenantContextStore = {
      tenantId: null,
      timezone: null,
      planType: null,
      region: null,
      roleId: null,
      role: null,
    };
    return this.asyncLocalStorage.run(store, callback);
  }

  /**
   * Initialize the tenant context from the request
   * This method is called automatically in the constructor
   */
  private async initializeTenantContext(): Promise<void> {
    // The actual tenant context will be set by the TenantMiddleware
    // This method is here for future initialization logic if needed
  }
}
