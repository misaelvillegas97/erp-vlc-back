import { Injectable, Logger }                                     from '@nestjs/common';
import { InjectQueue }                                            from '@nestjs/bullmq';
import { JobsOptions, Queue }                                     from 'bullmq';
import { EventEmitter2 }                                          from '@nestjs/event-emitter';
import { InjectRepository }                                       from '@nestjs/typeorm';
import { Repository }                                             from 'typeorm';
import { DateTime }                                               from 'luxon';
import { AuditEntity, ProcedureVersionEntity, PublicationEntity } from '../domain/entities';
import { AuditAction, PublicationStatus }                         from '../domain/enums';

/**
 * Interface for publication scheduling parameters
 */
export interface SchedulePublicationParams {
  versionId: string;
  scheduledDate: Date;
  effectiveDate: Date;
  requiresPreNotice?: boolean;
  preNoticeStartDate?: Date;
  affectsUnionAgreements?: boolean;
  requiresJointCommittee?: boolean;
  scheduledBy: string;
  tenantId: string;
}

/**
 * Interface for job scheduler status
 */
export interface JobSchedulerInfo {
  id: string;
  name: string;
  nextRunTime?: Date;
  pattern?: string;
  isActive: boolean;
  jobsCount: number;
  lastJobStatus?: string;
}

/**
 * Service for managing publication scheduling with BullMQ
 * Implements Chilean legal compliance for procedure publication timing
 */
@Injectable()
export class PublicationSchedulerService {
  private readonly logger = new Logger(PublicationSchedulerService.name);

  constructor(
    @InjectQueue('publication-scheduler')
    private readonly publicationQueue: Queue,
    @InjectRepository(ProcedureVersionEntity)
    private readonly versionRepository: Repository<ProcedureVersionEntity>,
    @InjectRepository(PublicationEntity)
    private readonly publicationRepository: Repository<PublicationEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Schedule a procedure publication with legal compliance checks
   */
  async schedulePublication(params: SchedulePublicationParams): Promise<PublicationEntity> {
    this.logger.log(`Scheduling publication for version ${ params.versionId }`);

    // Verify version exists and is approved
    const version = await this.versionRepository.findOne({
      where: {id: params.versionId, tenantId: params.tenantId}
    });

    if (!version) {
      throw new Error('Procedure version not found');
    }

    if (version.status !== 'APPROVED') {
      throw new Error('Only approved versions can be scheduled for publication');
    }

    // Calculate pre-notice dates if required
    let preNoticeStartDate = params.preNoticeStartDate;
    if (params.requiresPreNotice && !preNoticeStartDate) {
      // Default 30-day pre-notice as required by Chilean law
      const scheduledUTC = this.toUTC(params.scheduledDate);
      preNoticeStartDate = new Date(scheduledUTC.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    // Create publication entity
    const publication = this.publicationRepository.create({
      versionId: params.versionId,
      tenantId: params.tenantId,
      publishedBy: params.scheduledBy,
      status: PublicationStatus.SCHEDULED,
      publicationTitle: version.title,
      scheduledDate: params.scheduledDate,
      effectiveDate: params.effectiveDate,
      preNoticeStartDate,
      requiresPreNotice: params.requiresPreNotice || false,
      affectsUnionAgreements: params.affectsUnionAgreements || false,
      requiresJointCommittee: params.requiresJointCommittee || false,
      distributionTargets: [],
      legalEvidences: [],
      postingLocations: [],
      unionNotifications: [],
    });

    const savedPublication = await this.publicationRepository.save(publication);

    // Schedule jobs for different stages
    await this.schedulePublicationJobs(savedPublication);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.CREATE,
      entityType: 'Publication',
      entityId: savedPublication.id,
      userId: params.scheduledBy,
      description: `Publicación programada para ${ params.scheduledDate.toISOString() }`,
      newState: savedPublication,
      tenantId: params.tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.publication.scheduled', {
      publication: savedPublication,
      version,
      tenantId: params.tenantId,
      scheduledBy: params.scheduledBy,
    });

    this.logger.log(`Publication scheduled successfully with ID ${ savedPublication.id }`);
    return savedPublication;
  }

  /**
   * Cancel a scheduled publication and remove all related jobs
   */
  async cancelScheduledPublication(
    publicationId: string,
    cancelledBy: string,
    reason: string,
    tenantId: string
  ): Promise<void> {
    this.logger.log(`Cancelling scheduled publication ${ publicationId }`);

    // Update publication status
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new Error('Publication not found');
    }

    if (publication.status !== PublicationStatus.SCHEDULED) {
      throw new Error('Only scheduled publications can be cancelled');
    }

    await this.publicationRepository.update(publicationId, {
      status: PublicationStatus.SCHEDULED, // Keep as scheduled but mark as cancelled
      cancellationReason: reason,
      cancelledAt: new Date(),
    });

    // Remove scheduled jobs
    await this.removePublicationJobs(publicationId);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.DELETE,
      entityType: 'Publication',
      entityId: publicationId,
      userId: cancelledBy,
      description: `Publicación cancelada: ${ reason }`,
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.publication.cancelled', {
      publicationId,
      reason,
      tenantId,
      cancelledBy,
    });

    this.logger.log(`Publication ${ publicationId } cancelled successfully`);
  }

  /**
   * Get status of all scheduled publications
   */
  async getScheduledPublications(tenantId: string): Promise<PublicationEntity[]> {
    return this.publicationRepository.find({
      where: {
        status: PublicationStatus.SCHEDULED,
        tenantId
      },
      order: {scheduledDate: 'ASC'}
    });
  }

  /**
   * Get all job schedulers for management
   */
  async getJobSchedulers(): Promise<JobSchedulerInfo[]> {
    try {
      const schedulers = await this.publicationQueue.getJobSchedulers();

      return schedulers.map(scheduler => ({
        id: scheduler.id,
        name: scheduler.name,
        nextRunTime: scheduler.next ? new Date(scheduler.next) : undefined,
        pattern: scheduler.pattern,
        isActive: true, // Schedulers returned by getJobSchedulers are active
        jobsCount: 0, // BullMQ doesn't provide this directly
        lastJobStatus: undefined, // Would need to track separately
      }));
    } catch (error) {
      this.logger.error('Failed to get job schedulers:', error);
      return [];
    }
  }

  /**
   * Remove a specific job scheduler
   */
  async removeJobScheduler(schedulerId: string): Promise<boolean> {
    try {
      await this.publicationQueue.removeJobScheduler(schedulerId);
      this.logger.log(`Job scheduler ${ schedulerId } removed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove job scheduler ${ schedulerId }:`, error);
      return false;
    }
  }

  /**
   * Get queue health information
   */
  async getQueueHealth(): Promise<{
    isHealthy: boolean;
    activeJobs: number;
    waitingJobs: number;
    completedJobs: number;
    failedJobs: number;
    schedulers: JobSchedulerInfo[];
  }> {
    try {
      const waiting = await this.publicationQueue.getWaiting();
      const active = await this.publicationQueue.getActive();
      const completed = await this.publicationQueue.getCompleted();
      const failed = await this.publicationQueue.getFailed();

      // Get job schedulers information
      const schedulers = await this.getJobSchedulers();

      return {
        isHealthy: true,
        activeJobs: active.length,
        waitingJobs: waiting.length,
        completedJobs: completed.length,
        failedJobs: failed.length,
        schedulers,
      };
    } catch (error) {
      this.logger.error('Failed to get queue health', error);
      return {
        isHealthy: false,
        activeJobs: -1,
        waitingJobs: -1,
        completedJobs: -1,
        failedJobs: -1,
        schedulers: [],
      };
    }
  }

  /**
   * Process pre-notice job
   */
  async processPreNoticeJob(publicationId: string, tenantId: string): Promise<void> {
    this.logger.log(`Processing pre-notice job for publication ${ publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new Error('Publication not found');
    }

    // Update publication status
    await this.publicationRepository.update(publicationId, {
      status: PublicationStatus.PRE_NOTICE_SENT
    });

    // Create legal evidence
    const evidence = {
      type: 'OTHER' as const,
      title: 'Preaviso de 30 días',
      description: 'Preaviso legal de modificación del reglamento interno enviado',
      evidenceDate: new Date(),
      metadata: {
        noticeType: 'pre-notice',
        legalRequirement: 'Código del Trabajo Arts. 153 y 156'
      }
    };

    publication.legalEvidences = [ ...(publication.legalEvidences || []), evidence ];
    await this.publicationRepository.save(publication);

    // Emit event for notification service
    this.eventEmitter.emit('procedure.pre-notice.sent', {
      publicationId,
      tenantId,
    });

    this.logger.log(`Pre-notice processed for publication ${ publicationId }`);
  }

  /**
   * Convert a date to UTC from America/Santiago timezone
   */
  private toUTC(date: Date): Date {
    return DateTime.fromJSDate(date, {zone: 'America/Santiago'}).toUTC().toJSDate();
  }

  /**
   * Schedule all necessary jobs for a publication using BullMQ Job Schedulers for repetitive tasks
   */
  private async schedulePublicationJobs(publication: PublicationEntity): Promise<void> {
    const baseJobOptions: JobsOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 10,
    };

    // 1) PREAVISO diario 09:00 CL desde T-30 hasta T (Job Scheduler)
    if (publication.requiresPreNotice && publication.preNoticeStartDate) {
      await this.publicationQueue.upsertJobScheduler(
        `sched:prenotice:${ publication.id }`,
        {
          pattern: '0 9 * * *', // diario 09:00
          startDate: this.toUTC(publication.preNoticeStartDate),
          endDate: this.toUTC(publication.scheduledDate),
        },
        {
          name: 'pre-notice',
          data: {type: 'pre-notice', publicationId: publication.id, tenantId: publication.tenantId},
          opts: baseJobOptions,
        },
      );

      this.logger.log(`Pre-notice scheduler created from ${ publication.preNoticeStartDate.toISOString() } to ${ publication.scheduledDate.toISOString() }`);
    }

    // 2) RECORDATORIOS diarios 09:00 CL desde T hasta T+30 (Job Scheduler)
    const remindersEnd = publication.effectiveDate ?? new Date(publication.scheduledDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.publicationQueue.upsertJobScheduler(
      `sched:reminders:${ publication.id }`,
      {
        pattern: '0 9 * * *', // diario 09:00
        startDate: this.toUTC(publication.scheduledDate),
        endDate: this.toUTC(remindersEnd),
      },
      {
        name: 'daily-reminder',
        data: {type: 'reminder', publicationId: publication.id, tenantId: publication.tenantId},
        opts: baseJobOptions,
      },
    );

    this.logger.log(`Reminders scheduler created from ${ publication.scheduledDate.toISOString() } to ${ remindersEnd.toISOString() }`);

    // 3) NOTIFICACIÓN SINDICATOS (one-off delay) - MANTENER
    if (publication.affectsUnionAgreements) {
      const unionTs = this.toUTC(publication.scheduledDate).getTime() - 35 * 24 * 60 * 60 * 1000;
      await this.publicationQueue.add(
        'union-notification',
        {type: 'union-notification', publicationId: publication.id, tenantId: publication.tenantId},
        {...baseJobOptions, delay: Math.max(0, unionTs - Date.now()), jobId: `union-notice-${ publication.id }`},
      );

      this.logger.log(`Union notification job scheduled for ${ new Date(unionTs).toISOString() }`);
    }

    // 4) PUBLICACIÓN (one-off delay) - MANTENER
    await this.publicationQueue.add(
      'publication',
      {type: 'publication', publicationId: publication.id, tenantId: publication.tenantId},
      {
        ...baseJobOptions,
        delay: Math.max(0, this.toUTC(publication.scheduledDate).getTime() - Date.now()),
        jobId: `publication-${ publication.id }`
      },
    );

    this.logger.log(`Publication job scheduled for ${ publication.scheduledDate.toISOString() }`);

    // 5) COMPLIANCE CHECK a T+30 (one-off delay) - MANTENER
    const compTs = this.toUTC(publication.scheduledDate).getTime() + 30 * 24 * 60 * 60 * 1000;
    await this.publicationQueue.add(
      'compliance-check',
      {type: 'compliance-check', publicationId: publication.id, tenantId: publication.tenantId},
      {...baseJobOptions, delay: Math.max(0, compTs - Date.now()), jobId: `compliance-${ publication.id }`},
    );

    this.logger.log(`Compliance check job scheduled for ${ new Date(compTs).toISOString() }`);
  }

  /**
   * Remove all jobs and schedulers related to a publication
   */
  private async removePublicationJobs(publicationId: string): Promise<void> {
    // Remove job schedulers first
    const schedulerIds = [
      `sched:prenotice:${ publicationId }`,
      `sched:reminders:${ publicationId }`,
    ];

    for (const schedulerId of schedulerIds) {
      try {
        await this.publicationQueue.removeJobScheduler(schedulerId);
        this.logger.debug(`Removed scheduler ${ schedulerId }`);
      } catch (error) {
        this.logger.warn(`Failed to remove scheduler ${ schedulerId }: ${ error.message }`);
      }
    }

    // Remove delayed jobs
    const jobIds = [
      `union-notice-${ publicationId }`,
      `publication-${ publicationId }`,
      `compliance-${ publicationId }`,
    ];

    for (const jobId of jobIds) {
      try {
        const job = await this.publicationQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.debug(`Removed job ${ jobId }`);
        }
      } catch (error) {
        this.logger.warn(`Failed to remove job ${ jobId }: ${ error.message }`);
      }
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    userId: string;
    description: string;
    previousState?: any;
    newState?: any;
    tenantId: string;
  }): Promise<void> {
    try {
      const auditEntry = this.auditRepository.create({
        ...data,
        timestamp: new Date(),
        userFullName: 'Sistema', // TODO: Get from user service
        userEmail: 'system@example.com', // TODO: Get from user service
        success: true,
        sourceSystem: 'procedures-module',
        relatedEntities: [],
      });

      await this.auditRepository.save(auditEntry);
    } catch (error) {
      this.logger.error('Error creating audit log:', error);
    }
  }
}
