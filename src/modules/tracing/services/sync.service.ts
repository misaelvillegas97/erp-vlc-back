import { BadRequestException, Injectable }         from '@nestjs/common';
import { InjectRepository }                        from '@nestjs/typeorm';
import { MoreThan, Repository }                    from 'typeorm';
import { SyncOutboxEntity }                        from '../domain/entities/sync-outbox.entity';
import { FlowInstanceEntity }                      from '../domain/entities/flow-instance.entity';
import { StepExecutionEntity }                     from '../domain/entities/step-execution.entity';
import { FieldValueEntity }                        from '../domain/entities/field-value.entity';
import { WasteRecordEntity }                       from '../domain/entities/waste-record.entity';
import { OrderLinkEntity }                         from '../domain/entities/order-link.entity';
import { SyncPullRequestDto, SyncPullResponseDto } from '../domain/dto/sync/sync-pull.dto';
import { SyncPushRequestDto, SyncPushResponseDto } from '../domain/dto/sync/sync-push.dto';
import { SyncOperation }                           from '../domain/enums/sync-operation.enum';

/**
 * Service for managing offline synchronization
 * Implements outbox pattern for reliable sync with conflict resolution
 */
@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncOutboxEntity)
    private readonly syncOutboxRepository: Repository<SyncOutboxEntity>,
    @InjectRepository(FlowInstanceEntity)
    private readonly flowInstanceRepository: Repository<FlowInstanceEntity>,
    @InjectRepository(StepExecutionEntity)
    private readonly stepExecutionRepository: Repository<StepExecutionEntity>,
    @InjectRepository(FieldValueEntity)
    private readonly fieldValueRepository: Repository<FieldValueEntity>,
    @InjectRepository(WasteRecordEntity)
    private readonly wasteRecordRepository: Repository<WasteRecordEntity>,
    @InjectRepository(OrderLinkEntity)
    private readonly orderLinkRepository: Repository<OrderLinkEntity>,
  ) {}

  /**
   * Pull changes from server for offline client
   */
  async pullChanges(pullRequest: SyncPullRequestDto): Promise<SyncPullResponseDto> {
    const {since, deviceId, entityTypes} = pullRequest;
    const serverTimestamp = new Date();

    // Get changes from outbox since the requested timestamp
    const queryBuilder = this.syncOutboxRepository.createQueryBuilder('outbox')
      .where('outbox.createdAt > :since', {since})
      .andWhere('(outbox.deviceId IS NULL OR outbox.deviceId != :deviceId)', {deviceId});

    if (entityTypes && entityTypes.length > 0) {
      queryBuilder.andWhere('outbox.entityName IN (:...entityTypes)', {entityTypes});
    }

    queryBuilder.orderBy('outbox.createdAt', 'ASC');

    const outboxEntries = await queryBuilder.getMany();

    // Group changes by entity type
    const changes: Record<string, any[]> = {};
    const deletions: Record<string, string[]> = {};

    for (const entry of outboxEntries) {
      const entityName = entry.entityName;

      if (entry.op === SyncOperation.DELETE) {
        if (!deletions[entityName]) {
          deletions[entityName] = [];
        }
        deletions[entityName].push(entry.entityId);
      } else {
        if (!changes[entityName]) {
          changes[entityName] = [];
        }
        changes[entityName].push({
          id: entry.entityId,
          operation: entry.op,
          data: entry.payload,
          version: entry.version,
          timestamp: entry.createdAt,
        });
      }
    }

    // Get full entity data for creates and updates
    const fullChanges = await this.enrichChangesWithFullData(changes);

    const response = new SyncPullResponseDto();
    response.serverTimestamp = serverTimestamp.toISOString();
    response.changes = Object.values(fullChanges).flat() as any[];
    response.hasMore = outboxEntries.length >= 1000; // Pagination limit
    response.totalChanges = Object.values(fullChanges).flat().length;
    response.serverMetadata = {
      totalChanges: outboxEntries.length,
      oldestChange: outboxEntries[0]?.createdAt,
      newestChange: outboxEntries[outboxEntries.length - 1]?.createdAt,
    };

    return response;
  }

  /**
   * Push changes from offline client to server
   */
  async pushChanges(pushRequest: SyncPushRequestDto): Promise<SyncPushResponseDto> {
    const {changes, deviceId, lastKnownServerTimestamp} = pushRequest;
    const serverTimestamp = new Date();

    const appliedChanges: any[] = [];
    const conflicts: any[] = [];
    const errors: any[] = [];

    // Check for conflicts by comparing timestamps
    const conflictCheck = await this.checkForConflicts(changes, new Date(lastKnownServerTimestamp));

    for (const change of changes) {
      try {
        const hasConflict = conflictCheck.conflicts.some(c =>
          c.entityName === change.entityName && c.entityId === change.entityId
        );

        if (hasConflict) {
          conflicts.push({
            entityName: change.entityName,
            entityId: change.entityId,
            clientVersion: change.version,
            serverVersion: conflictCheck.serverVersions[`${ change.entityName }:${ change.entityId }`],
            resolution: 'server-wins', // Default conflict resolution strategy
            clientData: change.payload,
            serverData: await this.getEntityData(change.entityName, change.entityId),
          });
          continue;
        }

        // Apply the change
        const appliedChange = await this.applyChange(change);
        appliedChanges.push(appliedChange);

        // Create outbox entry for other devices
        await this.createOutboxEntry(
          change.entityName,
          change.entityId,
          change.operation,
          change.payload,
          deviceId
        );

      } catch (error) {
        errors.push({
          entityName: change.entityName,
          entityId: change.entityId,
          error: error.message,
          operation: change.operation,
        });
      }
    }

    const response = new SyncPushResponseDto();
    response.serverTimestamp = serverTimestamp.toISOString();
    response.appliedChanges = appliedChanges.map(change => change.id || change.entityId);
    response.failedChanges = errors.map(error => error.entityId);
    response.conflicts = conflicts;
    response.totalProcessed = changes.length;
    response.successCount = appliedChanges.length;
    response.failureCount = errors.length;
    response.conflictCount = conflicts.length;

    return response;
  }

  /**
   * Get sync status for a device
   */
  async getSyncStatus(deviceId: string): Promise<{
    lastSyncTimestamp: Date | null;
    pendingChanges: number;
    conflictsCount: number;
    syncHealth: 'healthy' | 'warning' | 'error';
  }> {
    // Get last successful sync
    const lastSync = await this.syncOutboxRepository.findOne({
      where: {deviceId},
      order: {createdAt: 'DESC'},
    });

    // Count pending changes for this device
    const pendingChanges = await this.syncOutboxRepository.count({
      where: {
        deviceId,
        processed: false,
      },
    });

    // Count recent conflicts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const conflictsCount = await this.syncOutboxRepository.count({
      where: {
        deviceId,
        createdAt: MoreThan(oneDayAgo),
        errorDetails: {$ne: null} as any, // Has error details indicating conflict
      },
    });

    // Determine sync health
    let syncHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    if (conflictsCount > 10) {
      syncHealth = 'error';
    } else if (pendingChanges > 100 || conflictsCount > 0) {
      syncHealth = 'warning';
    }

    return {
      lastSyncTimestamp: lastSync?.createdAt || null,
      pendingChanges,
      conflictsCount,
      syncHealth,
    };
  }

  /**
   * Resolve conflicts manually
   */
  async resolveConflicts(
    deviceId: string,
    resolutions: Array<{
      entityName: string;
      entityId: string;
      resolution: 'client-wins' | 'server-wins' | 'merge';
      mergedData?: any;
    }>
  ): Promise<{
    resolved: number;
    failed: Array<{ entityName: string; entityId: string; error: string }>;
  }> {
    let resolved = 0;
    const failed: Array<{ entityName: string; entityId: string; error: string }> = [];

    for (const resolution of resolutions) {
      try {
        switch (resolution.resolution) {
          case 'client-wins':
            // Apply client data, overwriting server
            await this.forceApplyChange({
              entityName: resolution.entityName,
              entityId: resolution.entityId,
              operation: SyncOperation.UPDATE,
              data: resolution.mergedData,
            });
            break;

          case 'server-wins':
            // Keep server data, mark conflict as resolved
            await this.markConflictResolved(resolution.entityName, resolution.entityId, deviceId);
            break;

          case 'merge':
            // Apply merged data
            if (!resolution.mergedData) {
              throw new Error('Merged data is required for merge resolution');
            }
            await this.forceApplyChange({
              entityName: resolution.entityName,
              entityId: resolution.entityId,
              operation: SyncOperation.UPDATE,
              data: resolution.mergedData,
            });
            break;
        }
        resolved++;
      } catch (error) {
        failed.push({
          entityName: resolution.entityName,
          entityId: resolution.entityId,
          error: error.message,
        });
      }
    }

    return {resolved, failed};
  }

  /**
   * Clean up old outbox entries
   */
  async cleanupOutbox(olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.syncOutboxRepository.delete({
      createdAt: MoreThan(cutoffDate),
      processed: true,
    });

    return {deletedCount: result.affected || 0};
  }

  /**
   * Create outbox entry for change propagation
   */
  async createOutboxEntry(
    entityName: string,
    entityId: string,
    operation: SyncOperation,
    payload: any,
    excludeDeviceId?: string
  ): Promise<void> {
    const outboxEntry = new SyncOutboxEntity();
    outboxEntry.entityName = entityName;
    outboxEntry.entityId = entityId;
    outboxEntry.op = operation;
    outboxEntry.payload = payload;
    outboxEntry.version = 1; // Will be incremented for updates
    outboxEntry.deviceId = excludeDeviceId ? null : undefined; // Exclude originating device
    outboxEntry.processed = false;

    await this.syncOutboxRepository.save(outboxEntry);
  }

  /**
   * Check for conflicts between client changes and server state
   */
  private async checkForConflicts(
    changes: any[],
    lastKnownServerTimestamp: Date
  ): Promise<{
    conflicts: Array<{ entityName: string; entityId: string }>;
    serverVersions: Record<string, number>;
  }> {
    const conflicts: Array<{ entityName: string; entityId: string }> = [];
    const serverVersions: Record<string, number> = {};

    // Check if any entities were modified on server after client's last sync
    for (const change of changes) {
      const serverChanges = await this.syncOutboxRepository.find({
        where: {
          entityName: change.entityName,
          entityId: change.entityId,
          createdAt: MoreThan(lastKnownServerTimestamp),
        },
        order: {createdAt: 'DESC'},
        take: 1,
      });

      if (serverChanges.length > 0) {
        conflicts.push({
          entityName: change.entityName,
          entityId: change.entityId,
        });
        serverVersions[`${ change.entityName }:${ change.entityId }`] = serverChanges[0].version;
      }
    }

    return {conflicts, serverVersions};
  }

  /**
   * Apply a change to the database
   */
  private async applyChange(change: any): Promise<any> {
    const {entityName, entityId, operation, data} = change;

    switch (entityName) {
      case 'FlowInstance':
        return this.applyFlowInstanceChange(entityId, operation, data);
      case 'StepExecution':
        return this.applyStepExecutionChange(entityId, operation, data);
      case 'FieldValue':
        return this.applyFieldValueChange(entityId, operation, data);
      case 'WasteRecord':
        return this.applyWasteRecordChange(entityId, operation, data);
      case 'OrderLink':
        return this.applyOrderLinkChange(entityId, operation, data);
      default:
        throw new BadRequestException(`Unsupported entity type: ${ entityName }`);
    }
  }

  /**
   * Apply flow instance change
   */
  private async applyFlowInstanceChange(entityId: string, operation: SyncOperation, data: any): Promise<any> {
    switch (operation) {
      case SyncOperation.CREATE:
        const instance = this.flowInstanceRepository.create(data);
        return this.flowInstanceRepository.save(instance);
      case SyncOperation.UPDATE:
        await this.flowInstanceRepository.update(entityId, data);
        return this.flowInstanceRepository.findOne({where: {id: entityId}});
      case SyncOperation.DELETE:
        await this.flowInstanceRepository.delete(entityId);
        return {id: entityId, deleted: true};
      default:
        throw new BadRequestException(`Unsupported operation: ${ operation }`);
    }
  }

  /**
   * Apply step execution change
   */
  private async applyStepExecutionChange(entityId: string, operation: SyncOperation, data: any): Promise<any> {
    switch (operation) {
      case SyncOperation.CREATE:
        const stepExecution = this.stepExecutionRepository.create(data);
        return this.stepExecutionRepository.save(stepExecution);
      case SyncOperation.UPDATE:
        await this.stepExecutionRepository.update(entityId, data);
        return this.stepExecutionRepository.findOne({where: {id: entityId}});
      case SyncOperation.DELETE:
        await this.stepExecutionRepository.delete(entityId);
        return {id: entityId, deleted: true};
      default:
        throw new BadRequestException(`Unsupported operation: ${ operation }`);
    }
  }

  /**
   * Apply field value change
   */
  private async applyFieldValueChange(entityId: string, operation: SyncOperation, data: any): Promise<any> {
    switch (operation) {
      case SyncOperation.CREATE:
        const fieldValue = this.fieldValueRepository.create(data);
        return this.fieldValueRepository.save(fieldValue);
      case SyncOperation.UPDATE:
        await this.fieldValueRepository.update(entityId, data);
        return this.fieldValueRepository.findOne({where: {id: entityId}});
      case SyncOperation.DELETE:
        await this.fieldValueRepository.delete(entityId);
        return {id: entityId, deleted: true};
      default:
        throw new BadRequestException(`Unsupported operation: ${ operation }`);
    }
  }

  /**
   * Apply waste record change
   */
  private async applyWasteRecordChange(entityId: string, operation: SyncOperation, data: any): Promise<any> {
    switch (operation) {
      case SyncOperation.CREATE:
        const wasteRecord = this.wasteRecordRepository.create(data);
        return this.wasteRecordRepository.save(wasteRecord);
      case SyncOperation.UPDATE:
        await this.wasteRecordRepository.update(entityId, data);
        return this.wasteRecordRepository.findOne({where: {id: entityId}});
      case SyncOperation.DELETE:
        await this.wasteRecordRepository.delete(entityId);
        return {id: entityId, deleted: true};
      default:
        throw new BadRequestException(`Unsupported operation: ${ operation }`);
    }
  }

  /**
   * Apply order link change
   */
  private async applyOrderLinkChange(entityId: string, operation: SyncOperation, data: any): Promise<any> {
    switch (operation) {
      case SyncOperation.CREATE:
        const orderLink = this.orderLinkRepository.create(data);
        return this.orderLinkRepository.save(orderLink);
      case SyncOperation.UPDATE:
        await this.orderLinkRepository.update(entityId, data);
        return this.orderLinkRepository.findOne({where: {id: entityId}});
      case SyncOperation.DELETE:
        await this.orderLinkRepository.delete(entityId);
        return {id: entityId, deleted: true};
      default:
        throw new BadRequestException(`Unsupported operation: ${ operation }`);
    }
  }

  /**
   * Get entity data for conflict resolution
   */
  private async getEntityData(entityName: string, entityId: string): Promise<any> {
    switch (entityName) {
      case 'FlowInstance':
        return this.flowInstanceRepository.findOne({where: {id: entityId}});
      case 'StepExecution':
        return this.stepExecutionRepository.findOne({where: {id: entityId}});
      case 'FieldValue':
        return this.fieldValueRepository.findOne({where: {id: entityId}});
      case 'WasteRecord':
        return this.wasteRecordRepository.findOne({where: {id: entityId}});
      case 'OrderLink':
        return this.orderLinkRepository.findOne({where: {id: entityId}});
      default:
        return null;
    }
  }

  /**
   * Force apply change (for conflict resolution)
   */
  private async forceApplyChange(change: any): Promise<any> {
    return this.applyChange({...change, forceApply: true});
  }

  /**
   * Mark conflict as resolved
   */
  private async markConflictResolved(entityName: string, entityId: string, deviceId: string): Promise<void> {
    await this.syncOutboxRepository.update(
      {
        entityName,
        entityId,
        deviceId,
      },
      {
        processed: true,
        processedAt: new Date(),
        errorDetails: null,
      }
    );
  }

  /**
   * Enrich changes with full entity data
   */
  private async enrichChangesWithFullData(changes: Record<string, any[]>): Promise<Record<string, any[]>> {
    const enrichedChanges: Record<string, any[]> = {};

    for (const [ entityName, entityChanges ] of Object.entries(changes)) {
      enrichedChanges[entityName] = [];

      for (const change of entityChanges) {
        const fullData = await this.getEntityData(entityName, change.id);
        enrichedChanges[entityName].push({
          ...change,
          data: fullData || change.data, // Use full data if available, fallback to payload
        });
      }
    }

    return enrichedChanges;
  }
}
