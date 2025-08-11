import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, }      from '@nestjs/swagger';
import { AuthGuard }                                                                   from '@nestjs/passport';
import { SyncService }                                                                 from '../services/sync.service';
import { SyncPullRequestDto, SyncPullResponseDto }                                     from '../domain/dto/sync/sync-pull.dto';
import { SyncPushRequestDto, SyncPushResponseDto }                                     from '../domain/dto/sync/sync-push.dto';

/**
 * Controller for offline synchronization operations
 * Handles pull/push operations for offline-first functionality
 */
@ApiTags('Synchronization')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tracing/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Pull changes from server for offline client
   */
  @Post('pull')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pull changes from server',
    description: 'Retrieves changes from server since the specified timestamp for offline synchronization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Changes retrieved successfully',
    type: SyncPullResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pull request parameters',
  })
  async pullChanges(
    @Body() pullRequest: SyncPullRequestDto,
  ): Promise<SyncPullResponseDto> {
    return this.syncService.pullChanges(pullRequest);
  }

  /**
   * Push changes from offline client to server
   */
  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Push changes to server',
    description: 'Sends local changes from offline client to server with conflict detection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Changes processed successfully',
    type: SyncPushResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid push request or data conflicts',
  })
  async pushChanges(
    @Body() pushRequest: SyncPushRequestDto,
  ): Promise<SyncPushResponseDto> {
    return this.syncService.pushChanges(pushRequest);
  }

  /**
   * Get synchronization status for a device
   */
  @Get('status/:deviceId')
  @ApiOperation({
    summary: 'Get sync status for device',
    description: 'Retrieves synchronization status and health information for a specific device',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier',
    example: 'device-abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lastSyncTimestamp: {type: 'string', format: 'date-time', nullable: true},
        pendingChanges: {type: 'number'},
        conflictsCount: {type: 'number'},
        syncHealth: {type: 'string', enum: [ 'healthy', 'warning', 'error' ]},
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found',
  })
  async getSyncStatus(
    @Param('deviceId') deviceId: string,
  ): Promise<{
    lastSyncTimestamp: Date | null;
    pendingChanges: number;
    conflictsCount: number;
    syncHealth: 'healthy' | 'warning' | 'error';
  }> {
    return this.syncService.getSyncStatus(deviceId);
  }

  /**
   * Resolve synchronization conflicts
   */
  @Post('conflicts/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve sync conflicts',
    description: 'Manually resolve synchronization conflicts with specified resolution strategies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conflicts resolved successfully',
    schema: {
      type: 'object',
      properties: {
        resolved: {type: 'number'},
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: {type: 'string'},
              entityId: {type: 'string'},
              error: {type: 'string'},
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid conflict resolution data',
  })
  async resolveConflicts(
    @Body() resolutionData: {
      deviceId: string;
      resolutions: Array<{
        entityName: string;
        entityId: string;
        resolution: 'client-wins' | 'server-wins' | 'merge';
        mergedData?: any;
      }>;
    },
  ): Promise<{
    resolved: number;
    failed: Array<{ entityName: string; entityId: string; error: string }>;
  }> {
    return this.syncService.resolveConflicts(resolutionData.deviceId, resolutionData.resolutions);
  }

  /**
   * Get sync health overview
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get sync health overview',
    description: 'Retrieves overall synchronization health metrics across all devices',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Time window in hours for health metrics (default: 24)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync health overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalDevices: {type: 'number'},
        healthyDevices: {type: 'number'},
        warningDevices: {type: 'number'},
        errorDevices: {type: 'number'},
        totalPendingChanges: {type: 'number'},
        totalConflicts: {type: 'number'},
        avgSyncLatency: {type: 'number'},
        lastSyncActivity: {type: 'string', format: 'date-time'},
      },
    },
  })
  getSyncHealthOverview(
    @Query('hours') hours: number = 24,
  ): {
    totalDevices: number;
    healthyDevices: number;
    warningDevices: number;
    errorDevices: number;
    totalPendingChanges: number;
    totalConflicts: number;
    avgSyncLatency: number;
    lastSyncActivity: Date | null;
  } {
    return this.getSyncHealthMetrics(hours);
  }

  /**
   * Clean up old sync data
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean up old sync data',
    description: 'Removes old processed sync entries to free up storage space',
  })
  @ApiQuery({
    name: 'olderThanDays',
    required: false,
    type: Number,
    description: 'Remove entries older than specified days (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: {type: 'number'},
        message: {type: 'string'},
      },
    },
  })
  async cleanupSyncData(
    @Query('olderThanDays') olderThanDays: number = 30,
  ): Promise<{
    deletedCount: number;
    message: string;
  }> {
    const result = await this.syncService.cleanupOutbox(olderThanDays);
    return {
      deletedCount: result.deletedCount,
      message: `Successfully cleaned up ${ result.deletedCount } old sync entries`,
    };
  }

  /**
   * Test sync connectivity
   */
  @Get('test/:deviceId')
  @ApiOperation({
    summary: 'Test sync connectivity',
    description: 'Tests synchronization connectivity and performance for a specific device',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device identifier to test',
    example: 'device-abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connectivity test completed',
    schema: {
      type: 'object',
      properties: {
        deviceId: {type: 'string'},
        connected: {type: 'boolean'},
        latency: {type: 'number'},
        lastSync: {type: 'string', format: 'date-time', nullable: true},
        pendingOperations: {type: 'number'},
        testTimestamp: {type: 'string', format: 'date-time'},
      },
    },
  })
  async testSyncConnectivity(
    @Param('deviceId') deviceId: string,
  ): Promise<{
    deviceId: string;
    connected: boolean;
    latency: number;
    lastSync: Date | null;
    pendingOperations: number;
    testTimestamp: Date;
  }> {
    const startTime = Date.now();
    const status = await this.syncService.getSyncStatus(deviceId);
    const latency = Date.now() - startTime;

    return {
      deviceId,
      connected: true, // If we got here, connection is working
      latency,
      lastSync: status.lastSyncTimestamp,
      pendingOperations: status.pendingChanges,
      testTimestamp: new Date(),
    };
  }

  /**
   * Get sync metrics for monitoring
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get sync metrics',
    description: 'Retrieves detailed synchronization metrics for monitoring and analytics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: [ 'hour', 'day', 'week', 'month' ],
    description: 'Time period for metrics aggregation (default: day)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: {type: 'string'},
        totalSyncOperations: {type: 'number'},
        successfulSyncs: {type: 'number'},
        failedSyncs: {type: 'number'},
        conflictsResolved: {type: 'number'},
        avgSyncTime: {type: 'number'},
        dataTransferred: {type: 'number'},
        activeDevices: {type: 'number'},
        topConflictReasons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              reason: {type: 'string'},
              count: {type: 'number'},
            },
          },
        },
      },
    },
  })
  getSyncMetrics(
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): {
    period: string;
    totalSyncOperations: number;
    successfulSyncs: number;
    failedSyncs: number;
    conflictsResolved: number;
    avgSyncTime: number;
    dataTransferred: number;
    activeDevices: number;
    topConflictReasons: Array<{ reason: string; count: number }>;
  } {
    // TODO: Implement detailed metrics collection
    // This would involve querying sync outbox and audit logs
    return {
      period,
      totalSyncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      avgSyncTime: 0,
      dataTransferred: 0,
      activeDevices: 0,
      topConflictReasons: [],
    };
  }

  /**
   * Get sync health metrics (private helper)
   */
  private getSyncHealthMetrics(hours: number): {
    totalDevices: number;
    healthyDevices: number;
    warningDevices: number;
    errorDevices: number;
    totalPendingChanges: number;
    totalConflicts: number;
    avgSyncLatency: number;
    lastSyncActivity: Date | null;
  } {
    // TODO: Implement comprehensive health metrics for the last ${hours} hours
    // This would involve aggregating data across all devices within the time window
    console.log(`Getting sync health metrics for the last ${ hours } hours`);
    return {
      totalDevices: 0,
      healthyDevices: 0,
      warningDevices: 0,
      errorDevices: 0,
      totalPendingChanges: 0,
      totalConflicts: 0,
      avgSyncLatency: 0,
      lastSyncActivity: null,
    };
  }
}
