import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity }        from '@shared/domain/entities/abstract.entity';
import { SyncOperation }         from '../enums/sync-operation.enum';

/**
 * Sync Outbox Entity
 * Implements the outbox pattern for offline synchronization
 * Tracks changes that need to be synchronized to client devices
 */
@Entity('tracing_sync_outbox')
@Index([ 'entityName', 'entityId' ])
export class SyncOutboxEntity extends AbstractEntity {
  @Column({name: 'entity_name'})
  @Index()
  entityName: string;

  @Column({name: 'entity_id'})
  @Index()
  entityId: string;

  @Column({
    type: 'enum',
    enum: SyncOperation
  })
  op: SyncOperation;

  @Column({type: 'json'})
  payload: Record<string, any>;

  @Column({type: 'int', default: 1})
  version: number;

  @Column({name: 'device_id', nullable: true})
  @Index()
  deviceId: string | null;

  @Column({type: 'boolean', default: false})
  processed: boolean;

  @Column({type: 'timestamp', nullable: true, name: 'processed_at'})
  processedAt: Date | null;

  @Column({type: 'int', default: 0, name: 'retry_count'})
  retryCount: number;

  @Column({type: 'timestamp', nullable: true, name: 'last_retry_at'})
  lastRetryAt: Date | null;

  @Column({type: 'json', nullable: true, name: 'error_details'})
  errorDetails: Record<string, any> | null;

  @Column({type: 'json', nullable: true, name: 'sync_metadata'})
  syncMetadata: Record<string, any> | null;
}
