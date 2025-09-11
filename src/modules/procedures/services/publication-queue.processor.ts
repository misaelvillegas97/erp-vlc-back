import { Injectable, Logger }                   from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job }                                  from 'bullmq';
import { InjectRepository }                     from '@nestjs/typeorm';
import { Repository }                           from 'typeorm';
import { EventEmitter2 }                        from '@nestjs/event-emitter';
import { AuditEntity, PublicationEntity }       from '../domain/entities';
import { AuditAction, PublicationStatus }       from '../domain/enums';
import { PublicationService }                   from './publication.service';

/**
 * Interface for job data structures
 */
interface BaseJobData {
  publicationId: string;
  tenantId: string;
  type: string;
}

interface PreNoticeJobData extends BaseJobData {
  type: 'pre-notice';
}

interface UnionNotificationJobData extends BaseJobData {
  type: 'union-notification';
}

interface PublicationJobData extends BaseJobData {
  type: 'publication';
}

interface ReminderJobData extends BaseJobData {
  type: 'reminder';
  interval: number; // days after publication
}

interface ComplianceCheckJobData extends BaseJobData {
  type: 'compliance-check';
}

type JobData = PreNoticeJobData | UnionNotificationJobData | PublicationJobData | ReminderJobData | ComplianceCheckJobData;

/**
 * BullMQ processor for handling publication-related scheduled jobs
 * Implements Chilean legal compliance job processing
 */
@Processor('publication-scheduler', {
  // Configure processor options
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 60000, // 1 minute
  },
})
@Injectable()
export class PublicationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(PublicationQueueProcessor.name);

  constructor(
    @InjectRepository(PublicationEntity)
    private readonly publicationRepository: Repository<PublicationEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly publicationService: PublicationService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * Main job processor - routes to specific handlers based on job data type
   */
  async process(job: Job<JobData>): Promise<any> {
    const {name, data} = job;
    const startTime = Date.now();

    this.logger.log(`Processing job ${ name } (type: ${ data.type }) for publication ${ data.publicationId }`);

    try {
      // Validate job data
      if (!data.type || !data.publicationId || !data.tenantId) {
        throw new Error(`Invalid job data: missing required fields (type: ${ data.type }, publicationId: ${ data.publicationId }, tenantId: ${ data.tenantId })`);
      }

      let result: any;

      // Route by data.type instead of job name for better decoupling
      switch (data.type) {
        case 'pre-notice':
          result = await this.handlePreNoticeJob(job as Job<PreNoticeJobData>);
          break;

        case 'union-notification':
          result = await this.handleUnionNotificationJob(job as Job<UnionNotificationJobData>);
          break;

        case 'publication':
          result = await this.handlePublicationJob(job as Job<PublicationJobData>);
          break;

        case 'reminder':
          result = await this.handleReminderJob(job as Job<ReminderJobData>);
          break;

        case 'compliance-check':
          result = await this.handleComplianceCheckJob(job as Job<ComplianceCheckJobData>);
          break;

        default:
          throw new Error(`Unknown job type: ${ (data as any).type || 'undefined' } (job name: ${ name })`);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Job ${ name } (type: ${ data.type }) completed successfully in ${ duration }ms`);

      // Update job progress
      await job.updateProgress(100);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Job ${ name } (type: ${ data.type }) failed after ${ duration }ms:`, error);

      // Create audit log for failed job
      await this.createAuditLog({
        action: AuditAction.UPDATE,
        entityType: 'PublicationJob',
        entityId: data.publicationId,
        userId: 'system',
        description: `Job ${ name } (${ data.type }) falló: ${ error.message }`,
        success: false,
        errorMessage: error.message,
        tenantId: data.tenantId,
      });

      throw error;
    }
  }

  /**
   * Worker event handlers for monitoring
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${ job.name } (${ job.id }) started processing`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${ job.name } (${ job.id }) completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${ job.name } (${ job.id }) failed: ${ error.message }`, error.stack);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${ job.name } (${ job.id }) progress: ${ progress }%`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job stalled: ${ jobId }`);
  }

  /**
   * Handle pre-notice job (30-day advance notice)
   */
  private async handlePreNoticeJob(job: Job<PreNoticeJobData>): Promise<void> {
    const {publicationId, tenantId} = job.data;

    this.logger.log(`Processing pre-notice for publication ${ publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId},
      relations: [ 'version' ]
    });

    if (!publication) {
      throw new Error(`Publication ${ publicationId } not found`);
    }

    // Update publication status
    await this.publicationRepository.update(publicationId, {
      status: PublicationStatus.PRE_NOTICE_SENT
    });

    // Create legal evidence for pre-notice
    const evidence = {
      type: 'OTHER' as const,
      title: 'Preaviso de 30 días',
      description: 'Preaviso legal de modificación del reglamento interno enviado conforme al Código del Trabajo',
      evidenceDate: new Date(),
      metadata: {
        noticeType: 'pre-notice',
        legalRequirement: 'Código del Trabajo Arts. 153 y 156',
        procedureTitle: publication.publicationTitle,
        effectiveDate: publication.effectiveDate
      }
    };

    // Add evidence to publication
    await this.publicationService.addLegalEvidence(
      publicationId,
      evidence,
      tenantId,
      'system'
    );

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId: 'system',
      description: 'Preaviso de 30 días enviado exitosamente',
      tenantId,
    });

    // Emit event for notification service
    this.eventEmitter.emit('procedure.pre-notice.sent', {
      publicationId,
      tenantId,
      publication,
    });

    this.logger.log(`Pre-notice sent successfully for publication ${ publicationId }`);
  }

  /**
   * Handle union notification job
   */
  private async handleUnionNotificationJob(job: Job<UnionNotificationJobData>): Promise<void> {
    const {publicationId, tenantId} = job.data;

    this.logger.log(`Processing union notifications for publication ${ publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new Error(`Publication ${ publicationId } not found`);
    }

    // Simulate sending union notifications
    // In a real implementation, this would integrate with email/notification services
    const unionNotifications = [
      {
        unionId: 'union-001',
        unionName: 'Sindicato de Trabajadores Principal',
        contactEmail: 'contacto@sindicato.cl',
        sentAt: new Date(),
        contactPerson: 'Representante Sindical'
      }
    ];

    // Update publication with union notifications
    await this.publicationService.updateUnionNotifications(
      publicationId,
      unionNotifications,
      tenantId,
      'system'
    );

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId: 'system',
      description: `Notificaciones sindicales enviadas a ${ unionNotifications.length } organizaciones`,
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.union-notifications.sent', {
      publicationId,
      tenantId,
      unionNotifications,
    });

    this.logger.log(`Union notifications sent successfully for publication ${ publicationId }`);
  }

  /**
   * Handle publication execution job
   */
  private async handlePublicationJob(job: Job<PublicationJobData>): Promise<void> {
    const {publicationId, tenantId} = job.data;

    this.logger.log(`Executing publication ${ publicationId }`);

    // Use the existing PublicationService to execute the publication
    await this.publicationService.executePublication({
      publicationId,
      tenantId,
      executedBy: 'system'
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.PUBLISH,
      entityType: 'Publication',
      entityId: publicationId,
      userId: 'system',
      description: 'Publicación ejecutada automáticamente por scheduler',
      tenantId,
    });

    this.logger.log(`Publication ${ publicationId } executed successfully via scheduled job`);
  }

  /**
   * Handle daily reminder job (from job scheduler)
   */
  private async handleReminderJob(job: Job<ReminderJobData>): Promise<void> {
    const {publicationId, tenantId} = job.data;

    this.logger.log(`Processing daily reminder for publication ${ publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId},
      relations: [ 'version' ]
    });

    if (!publication) {
      throw new Error(`Publication ${ publicationId } not found`);
    }

    // Check if publication is still active and requires reminders
    if (publication.status !== PublicationStatus.PUBLISHED &&
      publication.status !== PublicationStatus.DISTRIBUTED) {
      this.logger.log(`Publication ${ publicationId } is not active, skipping reminder`);
      return;
    }

    // Update reminder tracking
    const reminderSchedule = {
      enabled: true,
      lastReminderSent: new Date(),
      dailyRemindersCount: ((publication.reminderSchedule as any)?.dailyRemindersCount || 0) + 1,
      ...publication.reminderSchedule
    };

    await this.publicationRepository.update(publicationId, {
      reminderSchedule
    });

    // Send daily reminder notifications
    this.eventEmitter.emit('procedure.daily-reminder.send', {
      publicationId,
      tenantId,
      publication,
      reminderDate: new Date(),
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId: 'system',
      description: 'Recordatorio diario de lectura enviado',
      tenantId,
    });

    this.logger.log(`Daily reminder sent for publication ${ publicationId }`);
  }

  /**
   * Handle compliance check job
   */
  private async handleComplianceCheckJob(job: Job<ComplianceCheckJobData>): Promise<void> {
    const {publicationId, tenantId} = job.data;

    this.logger.log(`Running compliance check for publication ${ publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new Error(`Publication ${ publicationId } not found`);
    }

    // Check compliance requirements
    const pendingRequirements = publication.pendingComplianceRequirements;
    const isCompliant = pendingRequirements.length === 0;

    // Update publication metadata with compliance status
    const complianceReport = {
      checkedAt: new Date().toISOString(),
      isCompliant,
      pendingRequirements,
      acknowledgmentStats: publication.statistics,
      daysUntilEffective: publication.daysUntilEffective
    };

    await this.publicationRepository.update(publicationId, {
      metadata: {
        ...publication.metadata,
        complianceReport
      } as Record<string, any>
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId: 'system',
      description: `Verificación de cumplimiento: ${ isCompliant ? 'CONFORME' : 'PENDIENTE' }`,
      newState: {complianceReport},
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.compliance.checked', {
      publicationId,
      tenantId,
      isCompliant,
      pendingRequirements,
      complianceReport,
    });

    this.logger.log(`Compliance check completed for publication ${ publicationId }: ${ isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT' }`);
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
    success?: boolean;
    errorMessage?: string;
    tenantId: string;
  }): Promise<void> {
    try {
      const auditEntry = this.auditRepository.create({
        ...data,
        timestamp: new Date(),
        userFullName: 'Sistema Scheduler',
        userEmail: 'scheduler@system.local',
        success: data.success !== false,
        sourceSystem: 'procedures-scheduler',
        relatedEntities: [],
      });

      await this.auditRepository.save(auditEntry);
    } catch (error) {
      this.logger.error('Error creating audit log:', error);
    }
  }
}
