import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                                      from '@nestjs/typeorm';
import { Repository }                                                            from 'typeorm';
import { EventEmitter2 }                                                         from '@nestjs/event-emitter';
import { AuditEntity, ProcedureVersionEntity, ReviewRequestEntity }              from '../domain/entities';
import { AuditAction, ProcedureStatus, ReviewRole, ReviewStatus }                from '../domain/enums';

/**
 * DTO for creating a review request
 */
export interface CreateReviewRequestDto {
  versionId: string;
  reviewerId: string;
  reviewerRole: ReviewRole;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  sectionsToReview?: string[];
  reviewerInstructions?: string;
}

/**
 * DTO for submitting a review
 */
export interface SubmitReviewDto {
  status: ReviewStatus;
  comments?: string;
  sectionFeedback?: Record<string, {
    comment: string;
    status: 'APPROVED' | 'NEEDS_CHANGES' | 'REJECTED';
    suggestions?: string[];
  }>;
  actualReviewTime?: number; // in minutes
}

/**
 * Service for managing procedure reviews and approval workflow
 * Implements Chilean legal compliance review process
 */
@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ReviewRequestEntity)
    private readonly reviewRepository: Repository<ReviewRequestEntity>,
    @InjectRepository(ProcedureVersionEntity)
    private readonly versionRepository: Repository<ProcedureVersionEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new review request
   */
  async createReviewRequest(
    createReviewDto: CreateReviewRequestDto,
    requestedById: string,
    tenantId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<ReviewRequestEntity> {
    // Verify version exists and is in correct state
    const version = await this.versionRepository.findOne({
      where: {id: createReviewDto.versionId, tenantId}
    });

    if (!version) {
      throw new NotFoundException('Versión del procedimiento no encontrada');
    }

    // Check if version is in a state that allows review
    if (![ ProcedureStatus.DRAFT, ProcedureStatus.IN_REVIEW ].includes(version.status)) {
      throw new BadRequestException(
        `No se puede solicitar revisión para un procedimiento en estado ${ version.status }`
      );
    }

    // Check if there's already a pending review for this version and reviewer
    const existingReview = await this.reviewRepository.findOne({
      where: {
        versionId: createReviewDto.versionId,
        reviewerId: createReviewDto.reviewerId,
        status: ReviewStatus.PENDING,
        tenantId
      }
    });

    if (existingReview) {
      throw new ConflictException(
        'Ya existe una solicitud de revisión pendiente para este revisor'
      );
    }

    // Get next sequence number for this version
    const sequenceNumber = await this.getNextSequenceNumber(createReviewDto.versionId, tenantId);

    // Create review request
    const reviewRequest = this.reviewRepository.create({
      ...createReviewDto,
      tenantId,
      requestedBy: requestedById,
      sequenceNumber,
      status: ReviewStatus.PENDING,
      priority: createReviewDto.priority || 'MEDIUM',
      isLegalRequirement: this.isLegalRequirement(createReviewDto.reviewerRole),
      legalJustification: this.getLegalJustification(createReviewDto.reviewerRole),
    });

    const savedReview = await this.reviewRepository.save(reviewRequest);

    // Update version status to IN_REVIEW
    await this.versionRepository.update(createReviewDto.versionId, {
      status: ProcedureStatus.IN_REVIEW
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.CREATE,
      entityType: 'ReviewRequest',
      entityId: savedReview.id,
      userId: requestedById,
      description: `Solicitud de revisión creada para ${ createReviewDto.reviewerRole }`,
      newState: savedReview,
      context: userContext,
      tenantId,
      relatedEntities: [ {
        entityType: 'ProcedureVersion',
        entityId: createReviewDto.versionId,
        relationshipType: 'reviewed'
      } ],
    });

    // Emit event for notifications
    this.eventEmitter.emit('procedure.review.requested', {
      review: savedReview,
      version,
      tenantId,
      requestedBy: requestedById,
    });

    return savedReview;
  }

  /**
   * Submit a review (approve, request changes, or reject)
   */
  async submitReview(
    reviewId: string,
    submitReviewDto: SubmitReviewDto,
    reviewerId: string,
    tenantId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<ReviewRequestEntity> {
    // Get review request
    const review = await this.reviewRepository.findOne({
      where: {id: reviewId, tenantId},
      relations: [ 'version' ]
    });

    if (!review) {
      throw new NotFoundException('Solicitud de revisión no encontrada');
    }

    // Verify reviewer
    if (review.reviewerId !== reviewerId) {
      throw new BadRequestException('No tiene permisos para completar esta revisión');
    }

    // Check if review can be completed
    if (!review.canBeCompleted) {
      throw new BadRequestException(
        `La revisión no se puede completar en estado ${ review.status }`
      );
    }

    // Update review with submission data
    const updatedReview = await this.reviewRepository.save({
      ...review,
      status: submitReviewDto.status,
      comments: submitReviewDto.comments,
      sectionFeedback: submitReviewDto.sectionFeedback,
      actualReviewTime: submitReviewDto.actualReviewTime,
      reviewedAt: new Date(),
      reviewerIp: userContext?.ip,
      reviewerUserAgent: userContext?.userAgent,
    });

    // Handle review outcome
    await this.handleReviewOutcome(updatedReview, tenantId, reviewerId, userContext);

    // Create audit log
    await this.createAuditLog({
      action: this.getAuditActionForReviewStatus(submitReviewDto.status),
      entityType: 'ReviewRequest',
      entityId: reviewId,
      userId: reviewerId,
      description: `Revisión ${ submitReviewDto.status.toLowerCase() }: ${ submitReviewDto.comments || 'Sin comentarios' }`,
      previousState: review,
      newState: updatedReview,
      context: userContext,
      tenantId,
      relatedEntities: [ {
        entityType: 'ProcedureVersion',
        entityId: review.versionId,
        relationshipType: 'reviewed'
      } ],
    });

    // Emit event
    this.eventEmitter.emit('procedure.review.completed', {
      review: updatedReview,
      previousStatus: review.status,
      tenantId,
      reviewerId,
    });

    return updatedReview;
  }

  /**
   * Get pending reviews for a user
   */
  async getPendingReviewsForUser(
    userId: string,
    tenantId: string
  ): Promise<ReviewRequestEntity[]> {
    return this.reviewRepository.find({
      where: {
        reviewerId: userId,
        status: ReviewStatus.PENDING,
        tenantId
      },
      relations: [ 'version' ],
      order: {createdAt: 'ASC'}
    });
  }

  /**
   * Get all reviews for a procedure version
   */
  async getReviewsForVersion(
    versionId: string,
    tenantId: string
  ): Promise<ReviewRequestEntity[]> {
    return this.reviewRepository.find({
      where: {versionId, tenantId},
      order: {sequenceNumber: 'ASC', createdAt: 'ASC'}
    });
  }

  /**
   * Start the full approval workflow for a version
   */
  async startApprovalWorkflow(
    versionId: string,
    initiatorId: string,
    tenantId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<ReviewRequestEntity[]> {
    const version = await this.versionRepository.findOne({
      where: {id: versionId, tenantId}
    });

    if (!version) {
      throw new NotFoundException('Versión del procedimiento no encontrada');
    }

    // Define the approval workflow sequence
    const workflowSteps: Array<{
      role: ReviewRole;
      priority: 'MEDIUM' | 'HIGH';
      dueDate: Date;
    }> = [
      {
        role: ReviewRole.SUPERVISOR,
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      },
      {
        role: ReviewRole.RISK_PREVENTION,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
      },
      {
        role: ReviewRole.JOINT_COMMITTEE,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      {
        role: ReviewRole.HR_LEGAL,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
      }
    ];

    const createdReviews: ReviewRequestEntity[] = [];

    // Create all review requests (they will be processed sequentially)
    for (const step of workflowSteps) {
      const reviewRequest = await this.createReviewRequest(
        {
          versionId,
          reviewerId: 'system', // Will be assigned to appropriate users
          reviewerRole: step.role,
          priority: step.priority,
          dueDate: step.dueDate,
          reviewerInstructions: this.getInstructionsForRole(step.role)
        },
        initiatorId,
        tenantId,
        userContext
      );

      createdReviews.push(reviewRequest);
    }

    return createdReviews;
  }

  /**
   * Handle the outcome of a review (create next review, update status, etc.)
   */
  private async handleReviewOutcome(
    review: ReviewRequestEntity,
    tenantId: string,
    reviewerId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const version = await this.versionRepository.findOne({
      where: {id: review.versionId, tenantId}
    });

    if (!version) return;

    switch (review.status) {
      case ReviewStatus.APPROVED:
        // Check if this is the final review step
        const nextRole = review.nextReviewerRole;

        if (nextRole) {
          // Create next review in workflow
          await this.createReviewRequest(
            {
              versionId: review.versionId,
              reviewerId: 'system', // Will be assigned
              reviewerRole: nextRole,
              priority: 'HIGH',
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            },
            reviewerId,
            tenantId,
            userContext
          );
        } else {
          // Final approval - mark version as approved
          await this.versionRepository.update(review.versionId, {
            status: ProcedureStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: reviewerId
          });
        }
        break;

      case ReviewStatus.CHANGES_REQUESTED:
      case ReviewStatus.REJECTED:
        // Return to draft status for changes
        await this.versionRepository.update(review.versionId, {
          status: ProcedureStatus.DRAFT
        });
        break;
    }
  }

  /**
   * Get next sequence number for a version
   */
  private async getNextSequenceNumber(versionId: string, tenantId: string): Promise<number> {
    const lastReview = await this.reviewRepository.findOne({
      where: {versionId, tenantId},
      order: {sequenceNumber: 'DESC'}
    });

    return (lastReview?.sequenceNumber || 0) + 1;
  }

  /**
   * Check if a review role is legally required
   */
  private isLegalRequirement(role: ReviewRole): boolean {
    const legalRoles = [
      ReviewRole.RISK_PREVENTION,
      ReviewRole.JOINT_COMMITTEE,
      ReviewRole.HR_LEGAL
    ];
    return legalRoles.includes(role);
  }

  /**
   * Get legal justification for required reviews
   */
  private getLegalJustification(role: ReviewRole): string | undefined {
    const justifications = {
      [ReviewRole.RISK_PREVENTION]: 'Ley 16.744 y DS 40/1969 - Prevención de Riesgos',
      [ReviewRole.JOINT_COMMITTEE]: 'DS 54/1969 - Comité Paritario de Higiene y Seguridad',
      [ReviewRole.HR_LEGAL]: 'Código del Trabajo Arts. 153 y 156 - Reglamento Interno'
    };
    return justifications[role];
  }

  /**
   * Get instructions for each reviewer role
   */
  private getInstructionsForRole(role: ReviewRole): string {
    const instructions = {
      [ReviewRole.SUPERVISOR]: 'Revisar contenido técnico y aplicabilidad operacional',
      [ReviewRole.RISK_PREVENTION]: 'Evaluar medidas de prevención y cumplimiento normativo DS 594/1999',
      [ReviewRole.JOINT_COMMITTEE]: 'Validar aspectos de seguridad y salud ocupacional según DS 54/1969',
      [ReviewRole.HR_LEGAL]: 'Verificar cumplimiento legal y conformidad con Código del Trabajo'
    };
    return instructions[role] || 'Revisar y aprobar según corresponda';
  }

  /**
   * Get audit action based on review status
   */
  private getAuditActionForReviewStatus(status: ReviewStatus): AuditAction {
    switch (status) {
      case ReviewStatus.APPROVED:
        return AuditAction.APPROVE;
      case ReviewStatus.REJECTED:
        return AuditAction.REJECT;
      default:
        return AuditAction.UPDATE;
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
    context?: { ip?: string; userAgent?: string };
    tenantId: string;
    relatedEntities?: Array<{ entityType: string; entityId: string; relationshipType: string }>;
  }): Promise<void> {
    try {
      const auditEntry = this.auditRepository.create({
        ...data,
        timestamp: new Date(),
        userFullName: 'Sistema', // TODO: Get from user service
        userEmail: 'system@example.com', // TODO: Get from user service
        success: true,
        sourceSystem: 'procedures-module',
        relatedEntities: data.relatedEntities || [],
      });

      await this.auditRepository.save(auditEntry);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Error creating audit log:', error);
    }
  }
}
