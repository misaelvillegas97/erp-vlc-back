import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                from '@shared/domain/entities/abstract.entity';
import { TenantEntity }                  from '@modules/tenant/domain/entities/tenant.entity';

/**
 * Abstract base entity for tenant-aware entities.
 * Provides automatic tenant isolation by adding tenantId field.
 */
export abstract class TenantAbstractEntity extends AbstractEntity {
  @Column({name: 'tenant_id', type: 'uuid', nullable: true})
  tenantId: string;

  // We'll add the relation once the TenantEntity is implemented
  @ManyToOne(() => TenantEntity)
  @JoinColumn({name: 'tenant_id'})
  tenant: TenantEntity;
}
