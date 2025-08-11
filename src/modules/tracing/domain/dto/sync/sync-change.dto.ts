import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                             from '@nestjs/swagger';
import { SyncOperation }                                                                from '../../enums/sync-operation.enum';

/**
 * DTO for a single sync change
 */
export class SyncChangeDto {
  @ApiProperty({
    description: 'Unique identifier of the change',
    example: 'change-123'
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Name of the entity being changed',
    example: 'FlowInstance'
  })
  @IsString()
  @IsNotEmpty()
  entityName: string;

  @ApiProperty({
    description: 'ID of the entity being changed',
    example: 'instance-456'
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Type of operation',
    enum: SyncOperation,
    example: SyncOperation.UPDATE
  })
  @IsEnum(SyncOperation)
  operation: SyncOperation;

  @ApiProperty({
    description: 'Payload containing the entity data',
    example: {
      id: 'instance-456',
      status: 'ACTIVE',
      startedBy: 'user-123',
      contextData: {orderId: 'order-789'}
    }
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiProperty({
    description: 'Version number of the change',
    example: 1,
    minimum: 1
  })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({
    description: 'Device ID that originated the change',
    example: 'device-abc123'
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Timestamp when the change was created',
    example: '2025-08-08T02:13:00Z'
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the sync change',
    example: {
      source: 'mobile_app',
      userAgent: 'TracingApp/1.0',
      networkType: 'wifi'
    }
  })
  @IsOptional()
  @IsObject()
  syncMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Hash of the payload for integrity verification',
    example: 'sha256:abc123def456...'
  })
  @IsOptional()
  @IsString()
  payloadHash?: string;

  @ApiPropertyOptional({
    description: 'Dependencies on other changes (for ordering)',
    example: [ 'change-122', 'change-121' ]
  })
  @IsOptional()
  dependencies?: string[];
}

/**
 * DTO for sync conflict information
 */
export class SyncConflictDto {
  @ApiProperty({
    description: 'ID of the conflicting change',
    example: 'change-123'
  })
  changeId: string;

  @ApiProperty({
    description: 'Type of conflict',
    enum: [ 'VERSION_CONFLICT', 'CONCURRENT_MODIFICATION', 'DEPENDENCY_MISSING' ],
    example: 'VERSION_CONFLICT'
  })
  conflictType: 'VERSION_CONFLICT' | 'CONCURRENT_MODIFICATION' | 'DEPENDENCY_MISSING';

  @ApiProperty({
    description: 'Description of the conflict',
    example: 'Local version 2 conflicts with server version 3'
  })
  description: string;

  @ApiProperty({
    description: 'Server version of the entity',
    example: {
      id: 'instance-456',
      status: 'FINISHED',
      version: 3,
      updatedAt: '2025-08-08T03:00:00Z'
    }
  })
  serverVersion: Record<string, any>;

  @ApiProperty({
    description: 'Client version of the entity',
    example: {
      id: 'instance-456',
      status: 'ACTIVE',
      version: 2,
      updatedAt: '2025-08-08T02:45:00Z'
    }
  })
  clientVersion: Record<string, any>;

  @ApiProperty({
    description: 'Resolution strategy applied',
    enum: [ 'SERVER_WINS', 'CLIENT_WINS', 'MERGE', 'MANUAL_REQUIRED' ],
    example: 'SERVER_WINS'
  })
  resolution: 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'MANUAL_REQUIRED';

  @ApiPropertyOptional({
    description: 'Merged result if resolution was MERGE',
    example: {
      id: 'instance-456',
      status: 'FINISHED',
      version: 4,
      mergedFields: [ 'contextData', 'metadata' ]
    }
  })
  @IsOptional()
  mergedResult?: Record<string, any>;
}
