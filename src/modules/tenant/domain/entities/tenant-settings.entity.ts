import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                               from '@shared/domain/entities/abstract.entity';
import { TenantEntity }                                 from './tenant.entity';

/**
 * Represents hierarchical configuration settings for tenants.
 * Supports both tenant-level and user-level settings.
 */
@Entity('tenant_settings')
@Index([ 'tenantId', 'key', 'scope', 'userId' ], {unique: true})
export class TenantSettingsEntity extends AbstractEntity {
  @Column({name: 'tenant_id', type: 'uuid', nullable: false})
  tenantId: string;

  @Column({name: 'key', type: 'varchar', length: 255, nullable: false})
  key: string;

  @Column({name: 'value', type: 'jsonb', nullable: false})
  value: Record<string, any>;

  @Column({
    name: 'scope',
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: [ 'tenant', 'user' ],
    default: 'tenant'
  })
  scope: 'tenant' | 'user';

  @Column({name: 'user_id', type: 'uuid', nullable: true})
  userId: string | null;

  @Column({name: 'description', type: 'text', nullable: true})
  description: string | null;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({name: 'tenant_id'})
  tenant: TenantEntity;
}
