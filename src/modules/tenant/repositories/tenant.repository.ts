import { Injectable }                                                from '@nestjs/common';
import { InjectRepository }                                          from '@nestjs/typeorm';
import { Repository }                                                from 'typeorm';
import { TenantEntity }                                              from '../domain/entities/tenant.entity';
import { TenantSettingsEntity }                                      from '../domain/entities/tenant-settings.entity';
import { CreateTenantInput, TenantSettingsScope, UpdateTenantInput } from '../domain/interfaces/tenant.interfaces';

/**
 * Repository for managing tenant data operations.
 */
@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantSettingsEntity)
    private readonly tenantSettingsRepository: Repository<TenantSettingsEntity>,
  ) {}

  /**
   * Find a tenant by ID.
   * @param tenantId The tenant ID
   * @returns The tenant entity or null if not found
   */
  async findById(tenantId: string): Promise<TenantEntity | null> {
    return this.tenantRepository.findOne({
      where: {id: tenantId, isEnabled: true},
    });
  }

  /**
   * Find a tenant by subdomain.
   * @param subdomain The tenant subdomain
   * @returns The tenant entity or null if not found
   */
  async findBySubdomain(subdomain: string): Promise<TenantEntity | null> {
    return this.tenantRepository.findOne({
      where: {subdomain, isEnabled: true},
    });
  }

  /**
   * Check if a subdomain is already in use.
   * @param subdomain The subdomain to check
   * @param excludeTenantId Optional tenant ID to exclude from the check (for updates)
   * @returns True if subdomain is available, false if already in use
   */
  async isSubdomainAvailable(subdomain: string, excludeTenantId?: string): Promise<boolean> {
    const query = this.tenantRepository.createQueryBuilder('tenant')
      .where('tenant.subdomain = :subdomain', {subdomain});

    if (excludeTenantId) {
      query.andWhere('tenant.id != :excludeTenantId', {excludeTenantId});
    }

    const existing = await query.getOne();
    return !existing;
  }

  /**
   * Find all active tenants.
   * @returns Array of tenant entities
   */
  async findAll(): Promise<TenantEntity[]> {
    return this.tenantRepository.find({
      where: {isEnabled: true},
      order: {name: 'ASC'},
    });
  }

  /**
   * Create a new tenant.
   * @param input The tenant creation data
   * @returns The created tenant entity
   * @throws Error if subdomain is already in use
   */
  async create(input: CreateTenantInput): Promise<TenantEntity> {
    // Check if subdomain is available
    const isAvailable = await this.isSubdomainAvailable(input.subdomain);
    if (!isAvailable) {
      throw new Error(`Subdomain '${ input.subdomain }' is already in use`);
    }

    const tenant = this.tenantRepository.create({
      name: input.name,
      subdomain: input.subdomain,
      timezone: input.timezone ?? 'UTC',
      planType: input.planType ?? null,
      region: input.region ?? null,
      settings: input.settings ?? null,
    });

    return this.tenantRepository.save(tenant);
  }

  /**
   * Update a tenant.
   * @param tenantId The tenant ID
   * @param input The tenant update data
   * @returns The updated tenant entity or null if not found
   * @throws Error if subdomain is already in use by another tenant
   */
  async update(tenantId: string, input: UpdateTenantInput): Promise<TenantEntity | null> {
    const tenant = await this.findById(tenantId);
    if (!tenant) {
      return null;
    }

    // If subdomain is being updated, check availability
    if (input.subdomain && input.subdomain !== tenant.subdomain) {
      const isAvailable = await this.isSubdomainAvailable(input.subdomain, tenantId);
      if (!isAvailable) {
        throw new Error(`Subdomain '${ input.subdomain }' is already in use`);
      }
    }

    Object.assign(tenant, input);
    return this.tenantRepository.save(tenant);
  }

  /**
   * Soft delete a tenant.
   * @param tenantId The tenant ID
   * @returns True if deleted, false if not found
   */
  async delete(tenantId: string): Promise<boolean> {
    const result = await this.tenantRepository.softDelete(tenantId);
    return result.affected !== null && result.affected > 0;
  }

  /**
   * Get tenant settings by key and scope.
   * @param tenantId The tenant ID
   * @param key The setting key
   * @param scope The setting scope
   * @param userId Optional user ID for user-scoped settings
   * @returns The setting entity or null if not found
   */
  async getTenantSetting(
    tenantId: string,
    key: string,
    scope: TenantSettingsScope = 'tenant',
    userId?: string,
  ): Promise<TenantSettingsEntity | null> {
    return this.tenantSettingsRepository.findOne({
      where: {tenantId, key, scope, userId: userId ?? null},
    });
  }

  /**
   * Get all settings for a tenant.
   * @param tenantId The tenant ID
   * @param scope Optional scope filter
   * @param userId Optional user ID for user-scoped settings
   * @returns Array of setting entities
   */
  async getTenantSettings(
    tenantId: string,
    scope?: TenantSettingsScope,
    userId?: string,
  ): Promise<TenantSettingsEntity[]> {
    const where: any = {tenantId};

    if (scope) {
      where.scope = scope;
    }

    if (userId !== undefined) {
      where.userId = userId;
    }

    return this.tenantSettingsRepository.find({
      where,
      order: {key: 'ASC'},
    });
  }

  /**
   * Set or update a tenant setting.
   * @param tenantId The tenant ID
   * @param key The setting key
   * @param value The setting value
   * @param scope The setting scope
   * @param userId Optional user ID for user-scoped settings
   * @param description Optional description
   * @returns The upserted setting entity
   */
  async upsertTenantSetting(
    tenantId: string,
    key: string,
    value: Record<string, any>,
    scope: TenantSettingsScope = 'tenant',
    userId?: string,
    description?: string,
  ): Promise<TenantSettingsEntity> {
    const existing = await this.getTenantSetting(tenantId, key, scope, userId);

    if (existing) {
      existing.value = value;
      if (description !== undefined) {
        existing.description = description;
      }
      return this.tenantSettingsRepository.save(existing);
    }

    const setting = this.tenantSettingsRepository.create({
      tenantId,
      key,
      value,
      scope,
      userId: userId ?? null,
      description: description ?? null,
    });

    return this.tenantSettingsRepository.save(setting);
  }

  /**
   * Delete a tenant setting.
   * @param tenantId The tenant ID
   * @param key The setting key
   * @param scope The setting scope
   * @param userId Optional user ID for user-scoped settings
   * @returns True if deleted, false if not found
   */
  async deleteTenantSetting(
    tenantId: string,
    key: string,
    scope: TenantSettingsScope = 'tenant',
    userId?: string,
  ): Promise<boolean> {
    const result = await this.tenantSettingsRepository.delete({
      tenantId,
      key,
      scope,
      userId: userId ?? null,
    });

    return result.affected !== null && result.affected > 0;
  }
}
