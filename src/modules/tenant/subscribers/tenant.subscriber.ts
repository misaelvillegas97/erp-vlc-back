import { Injectable, Logger }                                                               from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import { TenantService }                                                                    from '../services/tenant.service';
import { BeforeQueryEvent }                                                                 from 'typeorm/subscriber/event/QueryEvent';
import { InjectDataSource }                                                                 from '@nestjs/typeorm';

/**
 * TypeORM subscriber that automatically assigns tenant_id to entities
 * that extend TenantEntity before they are persisted to the database.
 * Ensures proper tenant isolation at the data layer.
 */
@Injectable()
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface<any> {
  private readonly logger = new Logger(TenantSubscriber.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly tenantService: TenantService
  ) {
    this.logger.debug('TenantSubscriber initialized');

    this.ds.subscribers.push(this);
  }

  /**
   * Called before entity insertion.
   * Automatically sets the tenantId based on current tenant context.
   * @param event The insert event
   */
  beforeInsert(event: InsertEvent<any>): void {
    const entity = event.entity;

    if (!entity) {
      return;
    }

    // Check if entity has tenantId property (i.e., extends TenantAbstractEntity)
    if (!('tenantId' in entity)) {
      // this.logger.debug(`Entity ${ entity.constructor.name } does not have tenantId property, skipping tenant logic`);
      return;
    }

    // Skip if tenantId is already set (allows manual override)
    if (entity.tenantId) {
      this.logger.debug(`Entity ${ entity.constructor.name } already has tenantId: ${ entity.tenantId }`);
      return;
    }

    // Get current tenant ID from context
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      this.logger.warn(
        `No tenant context found when inserting ${ entity.constructor.name }. ` +
        'Entity will be created without tenant isolation.'
      );
      return;
    }

    // Set the tenant ID
    entity.tenantId = currentTenantId;

    this.logger.debug(
      `Auto-assigned tenant ID ${ currentTenantId } to ${ entity.constructor.name } on insert`
    );
  }

  /**
   * Called before entity update.
   * Ensures the tenantId cannot be changed during updates (tenant isolation integrity).
   * @param event The update event
   */
  beforeUpdate(event: UpdateEvent<any>): void {
    const entity = event.entity;

    if (!entity) return;

    // Check if entity has tenantId property (i.e., extends TenantAbstractEntity)
    if (!('tenantId' in entity)) return;

    // Get current tenant ID from context
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      this.logger.warn(
        `No tenant context found when updating ${ entity.constructor.name }. ` +
        'Update will proceed without tenant validation.'
      );
      return;
    }

    // Prevent tenant switching (security measure)
    if (entity.tenantId && entity.tenantId !== currentTenantId) {
      this.logger.error(
        `Attempted to update entity ${ entity.constructor.name } ` +
        `from tenant ${ entity.tenantId } while in context of tenant ${ currentTenantId }. ` +
        'This operation is blocked for security reasons.'
      );

      throw new Error(
        `Cross-tenant operation blocked: Cannot modify ${ entity.constructor.name } ` +
        `belonging to tenant ${ entity.tenantId } from tenant ${ currentTenantId }`
      );
    }

    // Set tenant ID if not present (shouldn't happen in normal operations)
    if (!entity.tenantId) {
      entity.tenantId = currentTenantId;
      this.logger.debug(
        `Auto-assigned tenant ID ${ currentTenantId } to ${ entity.constructor.name } on update`
      );
    }
  }

  /**
   * Called after entity is loaded from database.
   * Can be used to validate tenant access if needed.
   * @param entity The loaded entity
   */
  afterLoad(entity: any): void {
    // Check if entity has tenantId property (i.e., extends TenantAbstractEntity)
    if (!('tenantId' in entity)) return;

    // Optional: Add tenant access validation logic here
    // For now, we'll just log for debugging purposes

    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (currentTenantId && entity.tenantId && entity.tenantId !== currentTenantId) {
      this.logger.debug(
        `Loaded ${ entity.constructor.name } from tenant ${ entity.tenantId } ` +
        `while in context of tenant ${ currentTenantId }. ` +
        'This might indicate a cross-tenant query.'
      );
    }
  }

  /**
   * Called after entity insertion.
   * Logs successful tenant assignment for auditing purposes.
   * @param event The insert event
   */
  afterInsert(event: InsertEvent<any>): void {
    const entity = event.entity;

    if (!entity || !('tenantId' in entity)) return;

    if (entity.tenantId) {
      this.logger.log(
        `Successfully created ${ entity.constructor.name } ` +
        `with ID ${ entity.id } for tenant ${ entity.tenantId }`
      );
    }
  }

  /**
   * Called after entity update.
   * Logs successful update for auditing purposes.
   * @param event The update event
   */
  afterUpdate(event: UpdateEvent<any>): void {
    const entity = event.entity;

    if (!entity || !('tenantId' in entity)) return;

    if (entity.tenantId) {
      this.logger.debug(
        `Successfully updated ${ entity.constructor.name } ` +
        `with ID ${ entity.id } for tenant ${ entity.tenantId }`
      );
    }
  }

  /**
   * Called before query execution.
   * Automatically adds tenantId filter to SELECT queries when tenant context exists.
   * @param event The query event
   */
  beforeQuery(event: BeforeQueryEvent<any>): void {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    // Only proceed if we have a current tenant context
    if (!currentTenantId) {
      return;
    }

    const query = event.query.toLowerCase().trim();

    // Only intercept SELECT queries to avoid affecting INSERT/UPDATE/DELETE operations
    // that are already handled by other subscriber methods
    if (!query.startsWith('select')) {
      return;
    }

    // Check if the query involves tables that extend TenantAbstractEntity
    // by looking for tenant_id column references or table aliases that might have it
    if (!this.shouldApplyTenantFilter(event.query)) {
      return;
    }

    // Check if tenant filter is already present to avoid duplication
    if (this.hasTenantFilter(event.query)) {
      this.logger.debug('Query already contains tenant filter, skipping automatic addition');
      return;
    }

    // Add tenant filter to the query
    this.addTenantFilter(event, currentTenantId);
  }

  /**
   * Determines if the query should have tenant filtering applied.
   * Checks if the query involves tenant-aware tables.
   * @param query The SQL query string
   * @returns true if tenant filtering should be applied
   */
  private shouldApplyTenantFilter(query: string): boolean {
    // This is a simplified approach - in a more robust implementation,
    // you might want to parse the query to identify table names and check
    // if they extend TenantAbstractEntity
    const lowercaseQuery = query.toLowerCase();

    // Look for tenant_id column references which indicate tenant-aware tables
    return lowercaseQuery.includes('tenant_id') ||
      lowercaseQuery.includes('tenant.') ||
      // Add other patterns that indicate tenant-aware queries
      this.containsTenantAwareTable(lowercaseQuery);
  }

  /**
   * Checks if the query involves tenant-aware table names.
   * This method can be extended to include specific table names that extend TenantAbstractEntity.
   * @param query The lowercase SQL query string
   * @returns true if query contains tenant-aware tables
   */
  private containsTenantAwareTable(query: string): boolean {
    // Add known table names that extend TenantAbstractEntity
    // This list should be maintained based on your domain entities
    const tenantAwareTables = [
      'users',
      'products',
      'orders',
      'inventories',
      // Add other table names as needed
    ];

    return tenantAwareTables.some(table =>
      query.includes(`from ${ table }`) ||
      query.includes(`join ${ table }`) ||
      query.includes(`update ${ table }`) ||
      query.includes(`into ${ table }`)
    );
  }

  /**
   * Checks if the query already contains a tenant filter.
   * @param query The SQL query string
   * @returns true if tenant filter is already present
   */
  private hasTenantFilter(query: string): boolean {
    const lowercaseQuery = query.toLowerCase();
    return lowercaseQuery.includes('tenant_id =') ||
      lowercaseQuery.includes('tenant_id=') ||
      lowercaseQuery.includes('tenant_id in') ||
      lowercaseQuery.includes('tenant_id is');
  }

  /**
   * Adds tenant filter to the query.
   * @param event The query event
   * @param tenantId The current tenant ID
   */
  private addTenantFilter(event: BeforeQueryEvent<any>, tenantId: string): void {
    try {
      const originalQuery = event.query;

      // Simple approach: add WHERE clause or extend existing WHERE clause
      if (this.hasWhereClause(originalQuery)) {
        // Query already has WHERE clause, add AND condition
        event.query = originalQuery.replace(
          /\bwhere\b/i,
          `WHERE tenant_id = '${ tenantId }' AND`
        );
      } else {
        // No WHERE clause exists, add one
        // Find the position to insert WHERE clause (before ORDER BY, GROUP BY, LIMIT, etc.)
        const insertPosition = this.findWhereInsertPosition(originalQuery);
        if (insertPosition > -1) {
          event.query =
            originalQuery.substring(0, insertPosition) +
            ` WHERE tenant_id = '${ tenantId }'` +
            originalQuery.substring(insertPosition);
        } else {
          // Fallback: append at the end
          event.query = `${ originalQuery } WHERE tenant_id = '${ tenantId }'`;
        }
      }

      this.logger.debug(
        `Auto-added tenant filter for tenant ${ tenantId } to query. ` +
        `Original: ${ originalQuery.substring(0, 100) }...`
      );

    } catch (error) {
      this.logger.error(
        `Failed to add tenant filter to query: ${ error }. ` +
        `Query will execute without automatic tenant filtering.`
      );
    }
  }

  /**
   * Checks if the query has a WHERE clause.
   * @param query The SQL query string
   * @returns true if WHERE clause exists
   */
  private hasWhereClause(query: string): boolean {
    return /\bwhere\b/i.test(query);
  }

  /**
   * Finds the position where WHERE clause should be inserted.
   * @param query The SQL query string
   * @returns the position index, or -1 if not found
   */
  private findWhereInsertPosition(query: string): number {
    const keywords = [ 'order by', 'group by', 'having', 'limit', 'offset' ];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      const match = regex.exec(query);
      if (match) {
        return match.index;
      }
    }

    return -1; // No position found, append at end
  }
}
