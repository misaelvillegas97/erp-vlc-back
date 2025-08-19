import { Injectable, Logger }                                                   from '@nestjs/common';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import { TenantAbstractEntity }                                                 from '@shared/domain/entities/tenantAbstractEntity';
import { TenantService }                                                        from '../services/tenant.service';

/**
 * TypeORM subscriber that automatically assigns tenant_id to entities
 * that extend TenantEntity before they are persisted to the database.
 * Ensures proper tenant isolation at the data layer.
 */
@Injectable()
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface<TenantAbstractEntity> {
  private readonly logger = new Logger(TenantSubscriber.name);

  constructor(private readonly tenantService: TenantService) {}

  /**
   * Indicates that this subscriber only listen to TenantEntity events.
   * @returns The TenantEntity class
   */
  listenTo(): typeof TenantAbstractEntity {
    return TenantAbstractEntity;
  }

  /**
   * Called before entity insertion.
   * Automatically sets the tenantId based on current tenant context.
   * @param event The insert event
   */
  beforeInsert(event: InsertEvent<TenantAbstractEntity>): void {
    const entity = event.entity;

    if (!entity) {
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
  beforeUpdate(event: UpdateEvent<TenantAbstractEntity>): void {
    const entity = event.entity as TenantAbstractEntity;

    if (!entity) {
      return;
    }

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
  afterLoad(entity: TenantAbstractEntity): void {
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
  afterInsert(event: InsertEvent<TenantAbstractEntity>): void {
    const entity = event.entity;

    if (entity?.tenantId) {
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
  afterUpdate(event: UpdateEvent<TenantAbstractEntity>): void {
    const entity = event.entity as TenantAbstractEntity;

    if (entity?.tenantId) {
      this.logger.debug(
        `Successfully updated ${ entity.constructor.name } ` +
        `with ID ${ entity.id } for tenant ${ entity.tenantId }`
      );
    }
  }
}
