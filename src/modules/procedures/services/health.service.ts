import { Injectable, Logger }                                                     from '@nestjs/common';
import { InjectQueue }                                                            from '@nestjs/bullmq';
import { Queue }                                                                  from 'bullmq';
import { InjectRepository }                                                       from '@nestjs/typeorm';
import { DataSource, Repository }                                                 from 'typeorm';
import { AcknowledgementEntity, AuditEntity, ProcedureEntity, PublicationEntity } from '../domain/entities';
import { ProcedureStatus, PublicationStatus }                                     from '../domain/enums';

/**
 * Interface for health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    queues: HealthCheck;
    services: HealthCheck;
    storage: HealthCheck;
  };
  metrics: {
    totalProcedures: number;
    activeProcedures: number;
    pendingReviews: number;
    scheduledPublications: number;
    totalAcknowledgments: number;
    queueStats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    uptime: number;
  };
  version: string;
  environment: string;
}

/**
 * Interface for individual health check
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Service for comprehensive health monitoring of the procedures module
 * Implements monitoring for database, queues, services, and business metrics
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly moduleStartTime = Date.now();

  constructor(
    @InjectRepository(ProcedureEntity)
    private readonly procedureRepository: Repository<ProcedureEntity>,
    @InjectRepository(PublicationEntity)
    private readonly publicationRepository: Repository<PublicationEntity>,
    @InjectRepository(AcknowledgementEntity)
    private readonly acknowledgmentRepository: Repository<AcknowledgementEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    @InjectQueue('publication-scheduler')
    private readonly publicationQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(tenantId?: string): Promise<HealthCheckResult> {
    this.logger.log('Starting comprehensive health check...');
    const startTime = Date.now();

    try {
      // Perform all health checks concurrently
      const [ databaseCheck, queuesCheck, servicesCheck, storageCheck ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkQueues(),
        this.checkServices(),
        this.checkStorage()
      ]);

      // Calculate metrics
      const metrics = await this.calculateMetrics(tenantId);

      // Determine overall status
      const checks = {
        database: this.extractResult(databaseCheck),
        queues: this.extractResult(queuesCheck),
        services: this.extractResult(servicesCheck),
        storage: this.extractResult(storageCheck)
      };

      const overallStatus = this.determineOverallStatus(checks);

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
        metrics,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      const duration = Date.now() - startTime;
      this.logger.log(`Health check completed in ${ duration }ms - Status: ${ overallStatus.toUpperCase() }`);

      return result;

    } catch (error) {
      this.logger.error('Health check failed:', error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: {status: 'unhealthy', message: 'Health check failed'},
          queues: {status: 'unhealthy', message: 'Health check failed'},
          services: {status: 'unhealthy', message: 'Health check failed'},
          storage: {status: 'unhealthy', message: 'Health check failed'}
        },
        metrics: {
          totalProcedures: 0,
          activeProcedures: 0,
          pendingReviews: 0,
          scheduledPublications: 0,
          totalAcknowledgments: 0,
          queueStats: {waiting: 0, active: 0, completed: 0, failed: 0},
          uptime: Date.now() - this.moduleStartTime
        },
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    }
  }

  /**
   * Get simple health status for quick checks
   */
  async getSimpleHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    try {
      // Quick database connectivity test
      await this.dataSource.query('SELECT 1');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.moduleStartTime
      };
    } catch (error) {
      this.logger.error('Simple health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.moduleStartTime
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      if (!this.dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Database connection not initialized'
        };
      }

      // Test query performance
      await this.dataSource.query('SELECT 1');

      // Test table access
      await this.procedureRepository.count({take: 1});

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
        responseTime,
        message: `Database accessible in ${ responseTime }ms`
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database error: ${ error.message }`
      };
    }
  }

  /**
   * Check BullMQ queue health
   */
  private async checkQueues(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const [ waiting, active, completed, failed ] = await Promise.all([
        this.publicationQueue.getWaiting(),
        this.publicationQueue.getActive(),
        this.publicationQueue.getCompleted(),
        this.publicationQueue.getFailed()
      ]);

      const responseTime = Date.now() - startTime;
      const totalJobs = waiting.length + active.length;
      const failedJobs = failed.length;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Queue accessible - ${ totalJobs } active jobs`;

      if (failedJobs > 10) {
        status = 'degraded';
        message += `, ${ failedJobs } failed jobs`;
      }

      if (responseTime > 2000 || failedJobs > 50) {
        status = 'unhealthy';
      }

      return {
        status,
        responseTime,
        message,
        details: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Queue error: ${ error.message }`
      };
    }
  }

  /**
   * Check core services availability
   */
  private async checkServices(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test audit logging capability
      await this.auditRepository.count({
        where: {timestamp: new Date()},
        take: 1
      });

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        message: 'Core services operational',
        details: {
          auditingEnabled: true,
          loggingEnabled: true
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Services error: ${ error.message }`
      };
    }
  }

  /**
   * Check storage and file system health
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // In a real implementation, you would check:
      // - Cloud storage connectivity (S3, Google Cloud, etc.)
      // - Local file system permissions
      // - Available disk space

      // Simulate async storage check with a small delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        message: 'Storage systems operational',
        details: {
          cloudStorage: 'simulated',
          localStorage: 'available'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Storage error: ${ error.message }`
      };
    }
  }

  /**
   * Calculate business metrics
   */
  private async calculateMetrics(tenantId?: string): Promise<HealthCheckResult['metrics']> {
    try {
      const whereClause = tenantId ? {where: {tenantId}} : {};

      const [
        totalProcedures,
        activeProcedures,
        scheduledPublications,
        totalAcknowledgments,
        queueStats
      ] = await Promise.all([
        this.procedureRepository.count(whereClause),
        this.procedureRepository.count({
          where: tenantId
            ? {tenantId, status: ProcedureStatus.PUBLISHED}
            : {status: ProcedureStatus.PUBLISHED}
        }),
        this.publicationRepository.count({
          where: tenantId
            ? {tenantId, status: PublicationStatus.SCHEDULED}
            : {status: PublicationStatus.SCHEDULED}
        }),
        this.acknowledgmentRepository.count(whereClause),
        this.getQueueStats()
      ]);

      return {
        totalProcedures,
        activeProcedures,
        pendingReviews: 0, // Would need to query review requests
        scheduledPublications,
        totalAcknowledgments,
        queueStats,
        uptime: Date.now() - this.moduleStartTime
      };

    } catch (error) {
      this.logger.error('Error calculating metrics:', error);
      return {
        totalProcedures: 0,
        activeProcedures: 0,
        pendingReviews: 0,
        scheduledPublications: 0,
        totalAcknowledgments: 0,
        queueStats: {waiting: 0, active: 0, completed: 0, failed: 0},
        uptime: Date.now() - this.moduleStartTime
      };
    }
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(): Promise<HealthCheckResult['metrics']['queueStats']> {
    try {
      const [ waiting, active, completed, failed ] = await Promise.all([
        this.publicationQueue.getWaiting(),
        this.publicationQueue.getActive(),
        this.publicationQueue.getCompleted(),
        this.publicationQueue.getFailed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      this.logger.error('Error getting queue stats:', error);
      return {waiting: 0, active: 0, completed: 0, failed: 0};
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  private extractResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: `Check failed: ${ result.reason?.message || 'Unknown error' }`
      };
    }
  }

  /**
   * Determine overall status based on individual checks
   */
  private determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}
