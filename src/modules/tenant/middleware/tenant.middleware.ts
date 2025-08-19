import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response }    from 'express';
import { TenantService }                      from '../services/tenant.service';
import { TenantRepository }                   from '../repositories/tenant.repository';

/**
 * Cache for subdomain to tenant ID mapping
 */
interface SubdomainCacheEntry {
  tenantId: string;
  timestamp: number;
}

/**
 * Middleware for extracting and setting tenant context from request.
 * Checks for tenant ID in headers, subdomain, or JWT token with database lookup.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);
  private readonly subdomainCache = new Map<string, SubdomainCacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Handle async operations with proper promise handling
    const handleAsync = async (): Promise<void> => {
      try {
        // Clear any existing tenant context
        this.tenantService.clearCurrentTenantId();

        // Extract tenant ID from various sources
        const tenantId = await this.extractTenantId(req);

        console.log(`Tenant ID extracted: ${ tenantId }`);

        if (tenantId) {
          // Load tenant information from database and set full context
          const tenant = await this.tenantRepository.findById(tenantId);
          if (tenant) {
            this.tenantService.setTenantContext({
              tenantId: tenant.id,
              timezone: tenant.timezone,
              planType: tenant.planType ?? undefined,
              region: tenant.region ?? undefined,
            });

            this.logger.debug(`Tenant context set: ${ tenant.subdomain } -> ${ tenant.id }`);
          } else {
            this.logger.warn(`Tenant ${ tenantId } not found or disabled`);
          }
        }

        next();
      } catch (error) {
        this.logger.error('Error in tenant middleware', error);
        next();
      }
    };

    // Initialize async local storage context for this request
    this.tenantService.runWithEmptyContext(() => {
      void handleAsync();
    });
  }

  /**
   * Extract tenant ID from request headers, subdomain, or JWT token.
   * @param req The incoming request
   * @returns The tenant ID or null if not found
   */
  private async extractTenantId(req: Request): Promise<string | null> {
    // Method 1: Check for X-Tenant-ID header
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      this.logger.debug(`Tenant ID found in X-Tenant-ID header: ${ headerTenantId }`);
      return headerTenantId;
    }

    // Method 2: Check for Company-ID header (legacy support)
    const companyIdHeader = req.headers['company-id'] as string;
    if (companyIdHeader) {
      this.logger.debug(`Tenant ID found in Company-ID header: ${ companyIdHeader }`);
      return companyIdHeader;
    }

    // Method 3: Extract from subdomain and lookup tenant ID
    const subdomain = this.extractSubdomain(req);
    if (subdomain) {
      const tenantId = await this.mapSubdomainToTenantId(subdomain);
      if (tenantId) {
        this.logger.debug(`Tenant ID mapped from subdomain ${ subdomain } → ${ tenantId }`);
        return tenantId;
      }
    }

    // Method 4: Extract from JWT token
    const tokenTenantId = this.extractTenantFromToken(req);
    if (tokenTenantId) {
      this.logger.debug(`Tenant ID found in JWT token: ${ tokenTenantId }`);
      return tokenTenantId;
    }

    this.logger.debug('No tenant ID found in request');
    return null;
  }

  /**
   * Map subdomain to tenant ID with caching.
   * @param subdomain The subdomain to map
   * @returns The tenant ID or null if not found
   */
  private async mapSubdomainToTenantId(subdomain: string): Promise<string | null> {
    // Check cache first
    const cached = this.subdomainCache.get(subdomain);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      this.logger.debug(`Cache hit for subdomain ${ subdomain }: ${ cached.tenantId }`);
      return cached.tenantId;
    }

    // Cache miss or expired, lookup in database
    try {
      const tenant = await this.tenantRepository.findBySubdomain(subdomain);
      if (tenant) {
        // Update cache
        this.subdomainCache.set(subdomain, {
          tenantId: tenant.id,
          timestamp: now,
        });

        this.logger.debug(`Database lookup for subdomain ${ subdomain }: ${ tenant.id }`);
        return tenant.id;
      } else {
        this.logger.debug(`No tenant found for subdomain: ${ subdomain }`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error looking up tenant for subdomain ${ subdomain }`, error);
      return null;
    }
  }

  /**
   * Clear expired entries from subdomain cache.
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [ subdomain, entry ] of this.subdomainCache.entries()) {
      if ((now - entry.timestamp) >= this.CACHE_TTL) {
        this.subdomainCache.delete(subdomain);
      }
    }
  }

  /**
   * Extract subdomain from request hostname.
   * @param req The incoming request
   * @returns The subdomain or null if not found
   */
  private extractSubdomain(req: Request): string | null {
    const hostname = req.get('host');
    if (!hostname) {
      return null;
    }

    const parts = hostname.split('.');
    if (parts.length > 2) {
      // Return the first part as subdomain (e.g., 'tenant1' from 'tenant1.example.com')
      return parts[0];
    }

    return null;
  }

  /**
   * Extract tenant ID from JWT token.
   * @param req The incoming request
   * @returns The tenant ID or null if not found
   */
  private extractTenantFromToken(req: Request): string | null {
    // TODO: Implement JWT token parsing to extract tenant ID
    // This would typically involve:
    // 1. Getting the Authorization header
    // 2. Decoding the JWT token
    // 3. Extracting the tenant ID from the payload

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // For now, return null - implement JWT parsing when needed
    // const token = authHeader.substring(7);
    // const decoded = jwt.decode(token);
    // return decoded?.tenantId || null;

    return null;
  }

}
