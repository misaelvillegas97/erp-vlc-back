import { IsArray, IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                              from '@nestjs/swagger';
import { SyncChangeDto }                                                                 from './sync-change.dto';

/**
 * DTO for sync pull request
 */
export class SyncPullRequestDto {
  @ApiProperty({
    description: 'Device ID requesting the sync',
    example: 'device-abc123'
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Timestamp since when to pull changes (ISO string)',
    example: '2025-08-08T02:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of changes to return',
    example: 100,
    minimum: 1,
    default: 100
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Entity types to include in sync',
    example: [ 'FlowInstance', 'StepExecution', 'FieldValue' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  entityTypes?: string[];

  @ApiPropertyOptional({
    description: 'Template IDs to filter by',
    example: [ 'template-123', 'template-456' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  templateIds?: string[];

  @ApiPropertyOptional({
    description: 'User ID to filter changes by',
    example: 'user-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Client metadata for sync tracking',
    example: {
      appVersion: '1.2.3',
      platform: 'android',
      lastSyncAt: '2025-08-08T01:30:00Z'
    }
  })
  @IsOptional()
  @IsObject()
  clientMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to include deleted entities',
    example: true,
    default: true
  })
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Compression preference for response',
    enum: [ 'none', 'gzip', 'deflate' ],
    example: 'gzip'
  })
  @IsOptional()
  @IsString()
  compression?: 'none' | 'gzip' | 'deflate';
}

/**
 * DTO for sync pull response
 */
export class SyncPullResponseDto {
  @ApiProperty({
    description: 'Array of changes since the requested timestamp',
    type: [ SyncChangeDto ]
  })
  changes: SyncChangeDto[];

  @ApiProperty({
    description: 'Server timestamp for this sync response',
    example: '2025-08-08T02:30:00Z'
  })
  serverTimestamp: string;

  @ApiProperty({
    description: 'Whether there are more changes available',
    example: false
  })
  hasMore: boolean;

  @ApiPropertyOptional({
    description: 'Next cursor for pagination',
    example: 'cursor-abc123'
  })
  @IsOptional()
  nextCursor?: string;

  @ApiProperty({
    description: 'Total number of changes in this response',
    example: 25
  })
  totalChanges: number;

  @ApiPropertyOptional({
    description: 'Estimated total changes available',
    example: 150
  })
  @IsOptional()
  estimatedTotal?: number;

  @ApiPropertyOptional({
    description: 'Sync statistics',
    example: {
      byEntityType: {
        'FlowInstance': 10,
        'StepExecution': 12,
        'FieldValue': 3
      },
      byOperation: {
        'CREATE': 5,
        'UPDATE': 18,
        'DELETE': 2
      }
    }
  })
  @IsOptional()
  statistics?: {
    byEntityType: Record<string, number>;
    byOperation: Record<string, number>;
  };

  @ApiPropertyOptional({
    description: 'Server metadata for sync tracking',
    example: {
      serverVersion: '2.1.0',
      syncDuration: 150,
      compressionUsed: 'gzip'
    }
  })
  @IsOptional()
  serverMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Warnings or notices for the client',
    example: [
      'Some changes were filtered due to permissions',
      'Consider increasing sync frequency'
    ]
  })
  @IsOptional()
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Recommended next sync interval in seconds',
    example: 300
  })
  @IsOptional()
  recommendedSyncInterval?: number;

  @ApiPropertyOptional({
    description: 'Schema versions for entities',
    example: {
      'FlowInstance': '1.2',
      'StepExecution': '1.1',
      'FieldValue': '1.0'
    }
  })
  @IsOptional()
  schemaVersions?: Record<string, string>;
}
