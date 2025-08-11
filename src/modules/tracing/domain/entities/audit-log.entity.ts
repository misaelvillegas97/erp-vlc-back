import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity }        from '@shared/domain/entities/abstract.entity';

/**
 * Audit Log Entity
 * Records all changes and actions within the tracing system
 * Provides complete audit trail for compliance and debugging
 */
@Entity('tracing_audit_log')
@Index([ 'ts' ])
@Index([ 'entity', 'entityId' ])
@Index([ 'actorId', 'ts' ])
export class AuditLogEntity extends AbstractEntity {
  @Column()
  @Index()
  entity: string;

  @Column({name: 'entity_id'})
  @Index()
  entityId: string;

  @Column()
  @Index()
  action: string;

  @Column({name: 'actor_id'})
  @Index()
  actorId: string;

  @Column({type: 'json', nullable: true})
  before: Record<string, any> | null;

  @Column({type: 'json', nullable: true})
  after: Record<string, any> | null;

  @Column({type: 'timestamp'})
  ts: Date;

  @Column({type: 'text', nullable: true})
  description: string;

  @Column({type: 'json', nullable: true, name: 'context_data'})
  contextData: Record<string, any> | null;

  @Column({nullable: true, name: 'request_id'})
  requestId: string | null;

  @Column({nullable: true, name: 'trace_id'})
  traceId: string | null;

  @Column({nullable: true, name: 'span_id'})
  spanId: string | null;

  @Column({nullable: true, name: 'user_agent'})
  userAgent: string | null;

  @Column({nullable: true, name: 'ip_address'})
  ipAddress: string | null;

  @Column({type: 'json', nullable: true, name: 'metadata'})
  metadata: Record<string, any> | null;
}
