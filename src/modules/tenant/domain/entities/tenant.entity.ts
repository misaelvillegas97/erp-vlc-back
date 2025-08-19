import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity }        from '@shared/domain/entities/abstract.entity';

/**
 * Represents a tenant (company) in the multi-tenant system.
 * Each tenant has its own isolated data and configurations.
 */
@Entity('tenants')
@Index([ 'subdomain' ], {unique: true})
export class TenantEntity extends AbstractEntity {
  @Column({name: 'name', type: 'varchar', length: 255, nullable: false})
  name: string;

  @Column({
    name: 'subdomain',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true
  })
  subdomain: string;

  @Column({name: 'timezone', type: 'varchar', length: 50, default: 'UTC'})
  timezone: string;

  @Column({name: 'is_enabled', type: 'boolean', default: true})
  isEnabled: boolean;

  @Column({name: 'plan_type', type: 'varchar', length: 50, nullable: true})
  planType: string | null;

  @Column({name: 'region', type: 'varchar', length: 50, nullable: true})
  region: string | null;

  @Column({name: 'settings', type: 'jsonb', nullable: true})
  settings: Record<string, any> | null;
}
