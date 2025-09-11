import { Injectable, Logger, NotFoundException }                  from '@nestjs/common';
import { InjectRepository }                                       from '@nestjs/typeorm';
import { Repository }                                             from 'typeorm';
import { EventEmitter2 }                                          from '@nestjs/event-emitter';
import { AuditEntity, ProcedureVersionEntity, PublicationEntity } from '../domain/entities';
import { AuditAction, DistributionChannel, PublicationStatus }    from '../domain/enums';

/**
 * Interface for publication execution parameters
 */
export interface ExecutePublicationParams {
  publicationId: string;
  tenantId: string;
  executedBy?: string;
}

/**
 * Interface for distribution target configuration
 */
export interface DistributionTargetConfig {
  targetType: 'ALL_WORKERS' | 'DEPARTMENT' | 'ROLE' | 'SPECIFIC_USERS' | 'UNIONS' | 'JOINT_COMMITTEE';
  targetIds?: string[];
  targetNames?: string[];
  channels: DistributionChannel[];
  scheduledAt?: Date;
}

/**
 * Interface for legal evidence upload
 */
export interface LegalEvidenceUpload {
  type: 'JOINT_COMMITTEE_ACT' | 'POSTING_CONFIRMATION' | 'UNION_NOTIFICATION' | 'EMAIL_CONFIRMATION' | 'OTHER';
  title: string;
  description: string;
  fileUrl?: string;
  witnessName?: string;
  witnessRole?: string;
  location?: string;
  metadata?: Record<string, any>;
}

/**
 * Service for managing procedure publications
 * Handles Chilean legal compliance for procedure publication and distribution
 */
@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    @InjectRepository(PublicationEntity)
    private readonly publicationRepository: Repository<PublicationEntity>,
    @InjectRepository(ProcedureVersionEntity)
    private readonly versionRepository: Repository<ProcedureVersionEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute a scheduled publication
   */
  async executePublication(params: ExecutePublicationParams): Promise<PublicationEntity> {
    this.logger.log(`Executing publication ${ params.publicationId }`);

    const publication = await this.publicationRepository.findOne({
      where: {id: params.publicationId, tenantId: params.tenantId},
      relations: [ 'version' ]
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    if (publication.status !== PublicationStatus.SCHEDULED) {
      throw new Error(`Cannot execute publication in status ${ publication.status }`);
    }

    try {
      // TODO: Get pdf from content, download, and add to the context to sent in the email, be careful with garbage to be deleted

      // Update publication status
      await this.publicationRepository.update(params.publicationId, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: new Date()
      });

      // Start distribution process
      await this.initiateDistribution(publication);

      // Update statistics
      await this.updatePublicationStatistics(params.publicationId);

      // Create audit log
      await this.createAuditLog({
        action: AuditAction.PUBLISH,
        entityType: 'Publication',
        entityId: params.publicationId,
        userId: params.executedBy || 'system',
        description: 'Publicación ejecutada exitosamente',
        tenantId: params.tenantId,
      });

      // Emit event
      this.eventEmitter.emit('procedure.publication.executed', {
        publicationId: params.publicationId,
        tenantId: params.tenantId,
        executedBy: params.executedBy,
      });

      const updatedPublication = await this.publicationRepository.findOne({
        where: {id: params.publicationId, tenantId: params.tenantId}
      });

      this.logger.log(`Publication ${ params.publicationId } executed successfully`);
      return updatedPublication!;

    } catch (error) {
      this.logger.error(`Failed to execute publication ${ params.publicationId }:`, error);

      // Update publication with error
      const errorMetadata = {
        ...(publication.metadata || {}),
        lastError: {
          message: error.message,
          timestamp: new Date().toISOString(),
          stack: error.stack
        }
      } as Record<string, any>;

      await this.publicationRepository.update(params.publicationId, {
        notes: `Error durante ejecución: ${ error.message }`,
        metadata: errorMetadata
      });

      throw error;
    }
  }

  /**
   * Add distribution targets to a publication
   */
  async addDistributionTargets(
    publicationId: string,
    targets: DistributionTargetConfig[],
    tenantId: string,
    userId: string
  ): Promise<PublicationEntity> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Convert targets to distribution target format
    const distributionTargets = targets.flatMap(config =>
      config.channels.map(channel => ({
        targetType: config.targetType,
        targetIds: config.targetIds,
        targetNames: config.targetNames,
        channel,
        scheduledAt: config.scheduledAt,
      }))
    );

    // Add to existing targets
    publication.distributionTargets = [
      ...publication.distributionTargets,
      ...distributionTargets
    ];

    const updatedPublication = await this.publicationRepository.save(publication);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId,
      description: `${ distributionTargets.length } objetivos de distribución agregados`,
      tenantId,
    });

    return updatedPublication;
  }

  /**
   * Add legal evidence to a publication
   */
  async addLegalEvidence(
    publicationId: string,
    evidence: LegalEvidenceUpload,
    tenantId: string,
    userId: string
  ): Promise<PublicationEntity> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    const legalEvidence = {
      ...evidence,
      evidenceDate: new Date()
    };

    publication.legalEvidences = [
      ...publication.legalEvidences,
      legalEvidence
    ];

    const updatedPublication = await this.publicationRepository.save(publication);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId,
      description: `Evidencia legal agregada: ${ evidence.title }`,
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.legal-evidence.added', {
      publicationId,
      evidence: legalEvidence,
      tenantId,
      userId,
    });

    return updatedPublication;
  }

  /**
   * Update physical posting locations
   */
  async updatePostingLocations(
    publicationId: string,
    locations: Array<{
      locationId: string;
      locationName: string;
      address?: string;
      witnessName?: string;
      witnessSignature?: string;
      photo?: string;
    }>,
    tenantId: string,
    userId: string
  ): Promise<PublicationEntity> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Update posting locations with posted timestamp
    const postingLocations = locations.map(location => ({
      ...location,
      postedAt: new Date()
    }));

    publication.postingLocations = postingLocations;
    const updatedPublication = await this.publicationRepository.save(publication);

    // Create legal evidence for physical posting
    if (locations.length >= 2) {
      await this.addLegalEvidence(
        publicationId,
        {
          type: 'POSTING_CONFIRMATION',
          title: 'Constancia de Fijación en Lugares Visibles',
          description: `Procedimiento fijado en ${ locations.length } ubicaciones conforme al Código del Trabajo`,
          metadata: {
            locations: locations.map(l => l.locationName),
            postedAt: new Date(),
            legalRequirement: 'Código del Trabajo Arts. 153 y 156'
          }
        },
        tenantId,
        userId
      );
    }

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId,
      description: `${ locations.length } ubicaciones de fijación actualizadas`,
      tenantId,
    });

    return updatedPublication;
  }

  /**
   * Update union notifications
   */
  async updateUnionNotifications(
    publicationId: string,
    notifications: Array<{
      unionId: string;
      unionName: string;
      contactEmail?: string;
      contactPerson?: string;
      acknowledgmentReceived?: boolean;
      acknowledgmentDate?: Date;
    }>,
    tenantId: string,
    userId: string
  ): Promise<PublicationEntity> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId}
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Update union notifications with sent timestamp
    const unionNotifications = notifications.map(notification => ({
      ...notification,
      sentAt: new Date(),
      deliveredAt: notification.acknowledgmentReceived ? new Date() : undefined
    }));

    publication.unionNotifications = unionNotifications;
    const updatedPublication = await this.publicationRepository.save(publication);

    // Create legal evidence for union notification
    await this.addLegalEvidence(
      publicationId,
      {
        type: 'UNION_NOTIFICATION',
        title: 'Notificación a Organizaciones Sindicales',
        description: `Notificación enviada a ${ notifications.length } organizaciones sindicales`,
        metadata: {
          unions: notifications.map(n => n.unionName),
          sentAt: new Date(),
          legalRequirement: 'Código del Trabajo Arts. 153 y 156'
        }
      },
      tenantId,
      userId
    );

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Publication',
      entityId: publicationId,
      userId,
      description: `${ notifications.length } notificaciones sindicales actualizadas`,
      tenantId,
    });

    return updatedPublication;
  }

  /**
   * Get publication by ID
   */
  async getPublicationById(publicationId: string, tenantId: string): Promise<PublicationEntity> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId, tenantId},
      relations: [ 'version' ]
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    return publication;
  }

  /**
   * Get publications by status
   */
  async getPublicationsByStatus(
    status: PublicationStatus,
    tenantId: string
  ): Promise<PublicationEntity[]> {
    return this.publicationRepository.find({
      where: {status, tenantId},
      order: {scheduledDate: 'ASC'}
    });
  }

  /**
   * Initiate distribution to all configured targets
   */
  private async initiateDistribution(publication: PublicationEntity): Promise<void> {
    this.logger.log(`Initiating distribution for publication ${ publication.id }`);

    // Update distribution targets with sent timestamps
    const updatedTargets = publication.distributionTargets.map(target => ({
      ...target,
      sentAt: new Date()
    }));

    await this.publicationRepository.update(publication.id, {
      distributionTargets: updatedTargets,
      status: PublicationStatus.DISTRIBUTED
    });

    // Emit distribution events for each channel
    for (const target of publication.distributionTargets) {
      this.eventEmitter.emit('procedure.distribution.requested', {
        publicationId: publication.id,
        target,
        channel: target.channel,
        tenantId: publication.tenantId,
      });
    }

    this.logger.log(`Distribution initiated for ${ publication.distributionTargets.length } targets`);
  }

  /**
   * Update publication statistics
   */
  private async updatePublicationStatistics(publicationId: string): Promise<void> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId}
    });

    if (!publication) return;

    const statistics = {
      totalTargetUsers: this.calculateTotalTargetUsers(publication.distributionTargets),
      distributionsSent: publication.distributionTargets.filter(t => t.sentAt).length,
      distributionsDelivered: publication.distributionTargets.filter(t => t.deliveredAt).length,
      distributionsFailed: publication.distributionTargets.filter(t => t.failureReason).length,
      acknowledgementsReceived: 0, // Will be updated by AcknowledgementService
      acknowledgementsPercentage: 0,
      lastUpdated: new Date()
    };

    await this.publicationRepository.update(publicationId, {statistics});
  }

  /**
   * Calculate total target users from distribution targets
   */
  private calculateTotalTargetUsers(distributionTargets: any[]): number {
    // Simple estimation - in production, you would query actual user counts
    return distributionTargets.reduce((total, target) => {
      switch (target.targetType) {
        case 'ALL_WORKERS':
          return total + 1000; // Estimated company size
        case 'DEPARTMENT':
          return total + 50; // Average department size
        case 'ROLE':
          return total + 25; // Average role size
        case 'SPECIFIC_USERS':
          return total + (target.targetIds?.length || 0);
        case 'UNIONS':
          return total + 100; // Average union size
        case 'JOINT_COMMITTEE':
          return total + 10; // Committee size
        default:
          return total;
      }
    }, 0);
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
