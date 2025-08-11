import { IsArray, IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                                  from '@nestjs/swagger';
import { Type }                                                                              from 'class-transformer';
import { SyncChangeDto, SyncConflictDto }                                                    from './sync-change.dto';

/**
 * DTO for sync push request
 */
export class SyncPushRequestDto {
  @ApiProperty({
    description: 'Device ID pushing the changes',
    example: 'device-abc123'
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Array of changes to push to server',
    type: [ SyncChangeDto ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => SyncChangeDto)
  changes: SyncChangeDto[];

  @ApiPropertyOptional({
    description: 'Last known server timestamp from client',
    example: '2025-08-08T02:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  lastKnownServerTimestamp?: string;

  @ApiPropertyOptional({
    description: 'Client metadata for sync tracking',
    example: {
      appVersion: '1.2.3',
      platform: 'android',
      networkType: 'wifi',
      batteryLevel: 85
    }
  })
  @IsOptional()
  @IsObject()
  clientMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Conflict resolution preferences',
    example: {
      defaultStrategy: 'SERVER_WINS',
      fieldStrategies: {
        'contextData': 'MERGE',
        'metadata': 'CLIENT_WINS'
      }
    }
  })
  @IsOptional()
  @IsObject()
  conflictResolution?: {
    defaultStrategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'MANUAL_REQUIRED';
    fieldStrategies?: Record<string, 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE'>;
  };

  @ApiPropertyOptional({
    description: 'Whether to validate changes before applying',
    example: true,
    default: true
  })
  @IsOptional()
  validateChanges?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to apply changes atomically (all or none)',
    example: false,
    default: false
  })
  @IsOptional()
  atomicOperation?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum time to wait for conflict resolution in seconds',
    example: 30
  })
  @IsOptional()
  conflictTimeout?: number;
}

/**
 * DTO for sync push response
 */
export class SyncPushResponseDto {
  @ApiProperty({
    description: 'Array of successfully applied changes',
    type: [ String ]
  })
  appliedChanges: string[];

  @ApiProperty({
    description: 'Array of changes that failed to apply',
    type: [ String ]
  })
  failedChanges: string[];

  @ApiProperty({
    description: 'Array of conflicts that occurred',
    type: [ SyncConflictDto ]
  })
  conflicts: SyncConflictDto[];

  @ApiProperty({
    description: 'Server timestamp after processing changes',
    example: '2025-08-08T02:35:00Z'
  })
  serverTimestamp: string;

  @ApiProperty({
    description: 'Total number of changes processed',
    example: 15
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of changes successfully applied',
    example: 12
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of changes that failed',
    example: 1
  })
  failureCount: number;

  @ApiProperty({
    description: 'Number of conflicts detected',
    example: 2
  })
  conflictCount: number;

  @ApiPropertyOptional({
    description: 'Detailed results for each change',
    example: [
      {
        changeId: 'change-123',
        status: 'SUCCESS',
        appliedAt: '2025-08-08T02:35:01Z'
      },
      {
        changeId: 'change-124',
        status: 'CONFLICT',
        conflictType: 'VERSION_CONFLICT',
        resolution: 'SERVER_WINS'
      }
    ]
  })
  @IsOptional()
  changeResults?: Array<{
    changeId: string;
    status: 'SUCCESS' | 'FAILURE' | 'CONFLICT' | 'SKIPPED';
    error?: string;
    conflictType?: string;
    resolution?: string;
    appliedAt?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Server metadata for sync tracking',
    example: {
      serverVersion: '2.1.0',
      processingDuration: 250,
      conflictResolutionTime: 50
    }
  })
  @IsOptional()
  serverMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Warnings or notices for the client',
    example: [
      'Some changes were modified during conflict resolution',
      'Consider syncing more frequently to reduce conflicts'
    ]
  })
  @IsOptional()
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Recommended actions for the client',
    example: [
      'PULL_LATEST_CHANGES',
      'RETRY_FAILED_CHANGES',
      'RESOLVE_MANUAL_CONFLICTS'
    ]
  })
  @IsOptional()
  recommendedActions?: string[];

  @ApiPropertyOptional({
    description: 'Changes that need to be pulled by client due to conflicts',
    type: [ SyncChangeDto ]
  })
  @IsOptional()
  requiredPullChanges?: SyncChangeDto[];

  @ApiPropertyOptional({
    description: 'Statistics about the push operation',
    example: {
      byEntityType: {
        'FlowInstance': {success: 5, failed: 0, conflicts: 1},
        'StepExecution': {success: 7, failed: 1, conflicts: 1}
      },
      byOperation: {
        'CREATE': {success: 3, failed: 0, conflicts: 0},
        'UPDATE': {success: 8, failed: 1, conflicts: 2},
        'DELETE': {success: 1, failed: 0, conflicts: 0}
      }
    }
  })
  @IsOptional()
  statistics?: {
    byEntityType: Record<string, { success: number; failed: number; conflicts: number }>;
    byOperation: Record<string, { success: number; failed: number; conflicts: number }>;
  };

  @ApiPropertyOptional({
    description: 'Next recommended sync timestamp',
    example: '2025-08-08T02:40:00Z'
  })
  @IsOptional()
  nextSyncRecommendation?: string;
}
