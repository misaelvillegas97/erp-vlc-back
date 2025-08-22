import {
  DeepPartial,
  DeleteResult,
  EntityManager,
  EntityTarget,
  InsertResult,
  QueryRunner,
  RemoveOptions,
  Repository,
  SaveOptions,
  SelectQueryBuilder,
  UpdateResult
}                               from 'typeorm';
import { TenantAbstractEntity } from '@shared/domain/entities/tenantAbstractEntity';
import { TenantService }        from '@modules/tenant/services/tenant.service';

/**
 * Generic tenant-aware repository that automatically applies tenant filtering to queries.
 * Extends TypeORM Repository to add automatic tenant isolation for entities that extend TenantAbstractEntity.
 */
export class TenantRepository<T extends TenantAbstractEntity> extends Repository<T> {
  constructor(
    target: EntityTarget<T>,
    manager: EntityManager,
    private readonly tenantService: TenantService
  ) {
    super(target, manager);
  }

  /**
   * Override createQueryBuilder to automatically add tenant filtering.
   * @param alias Optional alias for the main entity
   * @param queryRunner Optional QueryRunner
   * @returns SelectQueryBuilder with tenant filtering applied
   */
  override createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<T> {
    const entityAlias = alias ?? this.metadata.tableName;
    const queryBuilder = super.createQueryBuilder(entityAlias, queryRunner);

    const tenantId = this.tenantService.getCurrentTenantId();

    if (tenantId) {
      return queryBuilder.andWhere(`${ entityAlias }.tenant_id = :tenantId`, {tenantId});
    }

    return queryBuilder;
  }

  /**
   * Override find to automatically apply tenant filtering.
   * @param options Find options
   * @returns Promise<T[]> filtered by tenant
   */
  override async find(options?: any): Promise<T[]> {
    const tenantId = this.tenantService.getCurrentTenantId();

    if (tenantId) {
      const findOptions = {...options};
      findOptions.where = {
        ...findOptions.where,
        tenantId
      };
      return super.find(findOptions);
    }

    return super.find(options);
  }

  /**
   * Override findOne to automatically apply tenant filtering.
   * @param options Find one options
   * @returns Promise<T | null> filtered by tenant
   */
  override async findOne(options?: any): Promise<T | null> {
    const tenantId = this.tenantService.getCurrentTenantId();

    if (tenantId) {
      const findOptions = {...options};
      findOptions.where = {
        ...findOptions.where,
        tenantId
      };
      return super.findOne(findOptions);
    }

    return super.findOne(options);
  }

  /**
   * Override count to automatically apply tenant filtering.
   * @param options Count options
   * @returns Promise<number> count filtered by tenant
   */
  override async count(options?: any): Promise<number> {
    const tenantId = this.tenantService.getCurrentTenantId();

    if (tenantId) {
      const countOptions = {...options};
      countOptions.where = {
        ...countOptions.where,
        tenantId
      };
      return super.count(countOptions);
    }

    return super.count(options);
  }

  /**
   * Override findAndCount to automatically apply tenant filtering.
   * @param options Find and count options
   * @returns Promise<[T[], number]> results and count filtered by tenant
   */
  override async findAndCount(options?: any): Promise<[ T[], number ]> {
    const tenantId = this.tenantService.getCurrentTenantId();

    if (tenantId) {
      const findOptions = {...options};
      findOptions.where = {
        ...findOptions.where,
        tenantId
      };
      return super.findAndCount(findOptions);
    }

    return super.findAndCount(options);
  }

  /**
   * Override save to automatically assign tenant ID and validate tenant isolation.
   * @param entities Entity or array of entities to save
   * @param options Save options
   * @returns Promise<T[]> saved entities
   */
  override async save<U extends DeepPartial<T>>(
    entities: U[],
    options?: SaveOptions
  ): Promise<U[]>;
  override async save<U extends DeepPartial<T>>(
    entity: U,
    options?: SaveOptions
  ): Promise<U>;
  override async save<U extends DeepPartial<T>>(
    entities: U | U[],
    options?: SaveOptions
  ): Promise<U | U[]> {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      throw new Error('No tenant context found. Cannot save entity without tenant isolation.');
    }

    const isArray = Array.isArray(entities);
    const entitiesArray = isArray ? entities : [ entities ];

    // Process each entity to ensure proper tenant assignment and validation
    const processedEntities = entitiesArray.map(entity => {
      const processedEntity = {...entity};

      // Auto-assign tenant ID if not present
      if (!processedEntity.tenantId) {
        processedEntity.tenantId = currentTenantId;
      }

      // Validate tenant isolation for existing entities
      if (processedEntity.tenantId && processedEntity.tenantId !== currentTenantId) {
        throw new Error(
          `Cross-tenant operation blocked: Cannot save entity belonging to tenant ${ processedEntity.tenantId } from tenant ${ currentTenantId }`
        );
      }

      return processedEntity;
    });

    const result = isArray
      ? await super.save(processedEntities as any, options)
      : await super.save(processedEntities[0] as any, options);

    return result;
  }

  /**
   * Override insert to automatically assign tenant ID.
   * @param entities Entity or array of entities to insert
   * @returns Promise<InsertResult>
   */
  override async insert(entities: any): Promise<InsertResult> {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      throw new Error('No tenant context found. Cannot insert entity without tenant isolation.');
    }

    const entitiesArray = Array.isArray(entities) ? entities : [ entities ];

    // Process each entity to ensure tenant assignment
    const processedEntities = entitiesArray.map(entity => {
      const processedEntity = {...entity};

      // Auto-assign tenant ID
      if (!processedEntity.tenantId) {
        processedEntity.tenantId = currentTenantId;
      }

      return processedEntity;
    });

    const entitiesToInsert = Array.isArray(entities) ? processedEntities : processedEntities[0];
    return super.insert(entitiesToInsert);
  }

  /**
   * Override update to validate tenant isolation.
   * @param criteria Update criteria
   * @param partialEntity Partial entity data
   * @returns Promise<UpdateResult>
   */
  override async update(
    criteria: any,
    partialEntity: any
  ): Promise<UpdateResult> {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      throw new Error('No tenant context found. Cannot update entity without tenant isolation.');
    }

    // Add tenant filter to update criteria
    const tenantAwareCriteria = {
      ...criteria,
      tenantId: currentTenantId
    };

    // Ensure the update doesn't change tenantId
    const safePartialEntity = {...partialEntity};
    if (safePartialEntity.tenantId && safePartialEntity.tenantId !== currentTenantId) {
      throw new Error(
        `Cross-tenant operation blocked: Cannot update entity to different tenant ${ safePartialEntity.tenantId } from tenant ${ currentTenantId }`
      );
    }

    return super.update(tenantAwareCriteria, safePartialEntity);
  }

  /**
   * Override remove to validate tenant ownership.
   * @param entities Entity or array of entities to remove
   * @param options Remove options
   * @returns Promise<T[]>
   */
  override async remove(entities: T[], options?: RemoveOptions): Promise<T[]>;
  override async remove(entity: T, options?: RemoveOptions): Promise<T>;
  override async remove(entities: T | T[], options?: RemoveOptions): Promise<T | T[]> {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      throw new Error('No tenant context found. Cannot remove entity without tenant validation.');
    }

    const entitiesArray = Array.isArray(entities) ? entities : [ entities ];

    // Validate tenant ownership for each entity
    entitiesArray.forEach(entity => {
      if (entity.tenantId && entity.tenantId !== currentTenantId) {
        throw new Error(
          `Cross-tenant operation blocked: Cannot remove entity belonging to tenant ${ entity.tenantId } from tenant ${ currentTenantId }`
        );
      }
    });

    return Array.isArray(entities)
      ? await super.remove(entities, options)
      : await super.remove(entities, options);
  }

  /**
   * Override delete to add tenant filtering.
   * @param criteria Delete criteria
   * @returns Promise<DeleteResult>
   */
  override async delete(criteria: any): Promise<DeleteResult> {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (!currentTenantId) {
      throw new Error('No tenant context found. Cannot delete entity without tenant isolation.');
    }

    // Add tenant filter to delete criteria
    const tenantAwareCriteria = {
      ...criteria,
      tenantId: currentTenantId
    };

    return super.delete(tenantAwareCriteria);
  }

  /**
   * Override create to prepare entity with tenant context.
   * @returns T
   */
  override create(): T;
  /**
   * Override create to prepare entity with tenant context.
   * @param entityLikeArray Entity data array
   * @returns T[]
   */
  override create(entityLikeArray: DeepPartial<T>[]): T[];
  /**
   * Override create to prepare entity with tenant context.
   * @param entityLike Entity data
   * @returns T
   */
  override create(entityLike: DeepPartial<T>): T;
  override create(entityLikeArray?: DeepPartial<T> | DeepPartial<T>[]): T | T[] {
    const currentTenantId = this.tenantService.getCurrentTenantId();

    if (entityLikeArray === undefined) {
      return super.create();
    }

    if (Array.isArray(entityLikeArray)) {
      // Process array of entities
      const processedEntities = entityLikeArray.map(entityData => {
        const processedEntity = {...entityData};

        // Auto-assign tenant ID if not present and we have tenant context
        if (currentTenantId && !processedEntity.tenantId) {
          processedEntity.tenantId = currentTenantId;
        }

        return processedEntity;
      });

      return super.create(processedEntities);
    } else {
      // Process single entity
      const processedEntity = {...entityLikeArray};

      // Auto-assign tenant ID if not present and we have tenant context
      if (currentTenantId && !processedEntity.tenantId) {
        processedEntity.tenantId = currentTenantId;
      }

      return super.create(processedEntity);
    }
  }
}
