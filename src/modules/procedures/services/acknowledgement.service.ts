import { BadRequestException, Injectable, Logger, NotFoundException }            from '@nestjs/common';
import { InjectRepository }                                                      from '@nestjs/typeorm';
import { Repository }                                                            from 'typeorm';
import { EventEmitter2 }                                                         from '@nestjs/event-emitter';
import { AcknowledgementEntity, AuditEntity, EConsentEntity, PublicationEntity } from '../domain/entities';
import { AuditAction, EConsentType }                                             from '../domain/enums';
import { DeviceInfo, QuizResult }                                                from '../domain/entities/acknowledgement.entity';

/**
 * Interface for creating an acknowledgment
 */
export interface CreateAcknowledgmentDto {
  publicationId: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userDepartment?: string;
  userRole?: string;
  userEmployeeId?: string;
  confirmedUnderstanding: boolean;
  readingTime?: number;
  userComments?: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  sessionId?: string;
  referrerUrl?: string;
}

/**
 * Interface for quiz submission
 */
export interface SubmitQuizDto {
  acknowledgmentId: string;
  quizResults: QuizResult[];
  totalTimeSpent: number; // in seconds
}

/**
 * Interface for electronic consent
 */
export interface CreateEConsentDto {
  userRut: string;
  consentType: EConsentType;
  consentText: string;
  consentedTextHash: string;
  digitalSignature?: string;
  digitalCertificate?: any;
  qualifiedTimestamp?: string;
  biometricData?: any;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Interface for acknowledgment validation
 */
export interface AcknowledgmentValidation {
  isValid: boolean;
  completenessScore: number;
  missingRequirements: string[];
  warnings: string[];
}

/**
 * Service for managing worker acknowledgments with Chilean legal compliance
 * Implements electronic signatures and quiz functionality
 */
@Injectable()
export class AcknowledgementService {
  private readonly logger = new Logger(AcknowledgementService.name);

  constructor(
    @InjectRepository(AcknowledgementEntity)
    private readonly acknowledgmentRepository: Repository<AcknowledgementEntity>,
    @InjectRepository(PublicationEntity)
    private readonly publicationRepository: Repository<PublicationEntity>,
    @InjectRepository(EConsentEntity)
    private readonly econsentRepository: Repository<EConsentEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new acknowledgment (idempotent)
   */
  async createAcknowledgment(
    createDto: CreateAcknowledgmentDto,
    tenantId: string,
    userContext?: { geoLocation?: any }
  ): Promise<AcknowledgementEntity> {
    this.logger.log(`Creating acknowledgment for publication ${ createDto.publicationId } by user ${ createDto.userId }`);

    // Check if acknowledgment already exists
    const existingAck = await this.acknowledgmentRepository.findOne({
      where: {
        publicationId: createDto.publicationId,
        userId: createDto.userId,
        tenantId
      }
    });

    if (existingAck) {
      this.logger.log(`Acknowledgment already exists for user ${ createDto.userId }, returning existing`);
      return existingAck;
    }

    // Get publication to check requirements
    const publication = await this.publicationRepository.findOne({
      where: {id: createDto.publicationId, tenantId},
      relations: [ 'version' ]
    });

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    // Validate acknowledgment deadline
    if (publication.acknowledgmentDeadline && new Date() > publication.acknowledgmentDeadline) {
      this.logger.warn(`Acknowledgment after deadline for user ${ createDto.userId }`);
    }

    // Calculate minimum reading time based on content
    const minimumReadingTime = this.calculateMinimumReadingTime(publication.version);

    // Check if quiz is required
    const quizRequired = publication.version?.procedure?.requiresQuiz || false;

    // Create acknowledgment
    const acknowledgment = this.acknowledgmentRepository.create({
      ...createDto,
      tenantId,
      acknowledgedAt: new Date(),
      geoLocation: userContext?.geoLocation,
      minimumReadingTime,
      quizRequired,
      isMandatory: true,
      acknowledgmentDeadline: publication.acknowledgmentDeadline,
      isLate: publication.acknowledgmentDeadline ? new Date() > publication.acknowledgmentDeadline : false,
      quizAttempts: 0,
      maxQuizAttempts: 3,
      isLegallyValid: this.validateAcknowledgmentLegality(createDto, minimumReadingTime),
    });

    const savedAcknowledgment = await this.acknowledgmentRepository.save(acknowledgment);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.ACKNOWLEDGE,
      entityType: 'Acknowledgment',
      entityId: savedAcknowledgment.id,
      userId: createDto.userId,
      description: `Acuse de recibo registrado para publicación ${ createDto.publicationId }`,
      newState: savedAcknowledgment,
      tenantId,
    });

    // Update publication statistics
    await this.updatePublicationStatistics(createDto.publicationId);

    // Emit event
    this.eventEmitter.emit('procedure.acknowledgment.created', {
      acknowledgment: savedAcknowledgment,
      publication,
      tenantId,
    });

    this.logger.log(`Acknowledgment created successfully with ID ${ savedAcknowledgment.id }`);
    return savedAcknowledgment;
  }

  /**
   * Submit quiz results for an acknowledgment
   */
  async submitQuiz(
    submitQuizDto: SubmitQuizDto,
    tenantId: string,
    userId: string
  ): Promise<AcknowledgementEntity> {
    this.logger.log(`Processing quiz submission for acknowledgment ${ submitQuizDto.acknowledgmentId }`);

    const acknowledgment = await this.acknowledgmentRepository.findOne({
      where: {id: submitQuizDto.acknowledgmentId, tenantId},
      relations: [ 'publication', 'publication.version' ]
    });

    if (!acknowledgment) {
      throw new NotFoundException('Acknowledgment not found');
    }

    if (acknowledgment.userId !== userId) {
      throw new BadRequestException('Cannot submit quiz for another user');
    }

    if (!acknowledgment.canRetakeQuiz) {
      throw new BadRequestException('Quiz cannot be retaken - maximum attempts reached or already passed');
    }

    // Get quiz questions from the procedure version
    const quizQuestions = acknowledgment.publication.version?.quizQuestions || [];

    if (quizQuestions.length === 0) {
      throw new BadRequestException('No quiz available for this procedure');
    }

    // Calculate score
    const correctAnswers = submitQuizDto.quizResults.filter(result => result.isCorrect).length;
    const score = (correctAnswers / quizQuestions.length) * 100;
    const passingScore = 70; // Default passing score
    const passed = score >= passingScore;

    // Update acknowledgment with quiz results
    const updatedAcknowledgment = await this.acknowledgmentRepository.save({
      ...acknowledgment,
      quizResults: submitQuizDto.quizResults,
      quizScore: score,
      quizPassingScore: passingScore,
      quizPassed: passed,
      quizAttempts: acknowledgment.quizAttempts + 1,
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Acknowledgment',
      entityId: acknowledgment.id,
      userId,
      description: `Quiz completado - Puntaje: ${ score }% (${ passed ? 'Aprobado' : 'Reprobado' })`,
      previousState: {quizAttempts: acknowledgment.quizAttempts},
      newState: {
        quizScore: score,
        quizPassed: passed,
        quizAttempts: updatedAcknowledgment.quizAttempts
      },
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.quiz.completed', {
      acknowledgment: updatedAcknowledgment,
      score,
      passed,
      attempt: updatedAcknowledgment.quizAttempts,
      tenantId,
    });

    this.logger.log(`Quiz submitted: ${ score }% (${ passed ? 'PASSED' : 'FAILED' }) - Attempt ${ updatedAcknowledgment.quizAttempts }`);
    return updatedAcknowledgment;
  }

  /**
   * Create electronic consent for an acknowledgment
   */
  async createElectronicConsent(
    acknowledgmentId: string,
    econsentDto: CreateEConsentDto,
    tenantId: string,
    userId: string
  ): Promise<EConsentEntity> {
    this.logger.log(`Creating electronic consent for acknowledgment ${ acknowledgmentId }`);

    const acknowledgment = await this.acknowledgmentRepository.findOne({
      where: {id: acknowledgmentId, tenantId}
    });

    if (!acknowledgment) {
      throw new NotFoundException('Acknowledgment not found');
    }

    if (acknowledgment.userId !== userId) {
      throw new BadRequestException('Cannot create consent for another user');
    }

    // Create electronic consent
    const econsent = this.econsentRepository.create({
      ...econsentDto,
      tenantId,
      userId: acknowledgment.userId,
      userFullName: acknowledgment.userFullName,
      userEmail: acknowledgment.userEmail,
      consentedAt: new Date(),
      explicitConsent: true,
      consentLanguage: 'es-CL',
      legalContext: {
        applicableLaws: [
          'Ley 19.799 - Sobre documentos electrónicos, firma electrónica y servicios de certificación',
          'Código del Trabajo - Arts. 153 y 156',
          'Ley 19.628 - Sobre protección de la vida privada'
        ],
        legalBasis: 'Acuse de recibo de procedimientos laborales',
        dataProcessingPurpose: 'Cumplimiento de obligaciones laborales y normativas',
        retentionPeriod: 7 // years as per Chilean labor law
      },
      auditTrail: [ {
        action: 'CREATE',
        timestamp: new Date(),
        userId,
        ipAddress: econsentDto.ipAddress,
        details: 'Consentimiento electrónico creado para acuse de recibo'
      } ]
    });

    // Perform system validation
    const systemValidation = this.performSystemValidation(econsent);
    econsent.systemValidation = systemValidation;
    econsent.isLegallyValid = systemValidation.certificateValid && systemValidation.signatureValid;

    const savedEconsent = await this.econsentRepository.save(econsent);

    // Update acknowledgment with e-consent reference
    await this.acknowledgmentRepository.update(acknowledgmentId, {
      econsentId: savedEconsent.id,
      econsentRequired: true
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.CONSENT,
      entityType: 'EConsent',
      entityId: savedEconsent.id,
      userId,
      description: `Consentimiento electrónico ${ econsentDto.consentType } creado`,
      newState: savedEconsent,
      tenantId,
    });

    // Emit event
    this.eventEmitter.emit('procedure.econsent.created', {
      econsent: savedEconsent,
      acknowledgmentId,
      tenantId,
    });

    this.logger.log(`Electronic consent created successfully with ID ${ savedEconsent.id }`);
    return savedEconsent;
  }

  /**
   * Validate an acknowledgment
   */
  async validateAcknowledgment(
    acknowledgmentId: string,
    tenantId: string,
    validatorId: string,
    validationComments?: string
  ): Promise<AcknowledgementEntity> {
    const acknowledgment = await this.acknowledgmentRepository.findOne({
      where: {id: acknowledgmentId, tenantId}
    });

    if (!acknowledgment) {
      throw new NotFoundException('Acknowledgment not found');
    }

    const validation = this.performAcknowledgmentValidation(acknowledgment);

    const updatedAcknowledgment = await this.acknowledgmentRepository.save({
      ...acknowledgment,
      validatedBy: validatorId,
      validatedAt: new Date(),
      validationComments,
      isLegallyValid: validation.isValid,
      invalidityReason: validation.isValid ? undefined : validation.missingRequirements.join('; ')
    });

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'Acknowledgment',
      entityId: acknowledgmentId,
      userId: validatorId,
      description: `Acuse validado - ${ validation.isValid ? 'VÁLIDO' : 'INVÁLIDO' }`,
      newState: {validation},
      tenantId,
    });

    return updatedAcknowledgment;
  }

  /**
   * Get acknowledgments for a publication
   */
  async getAcknowledgmentsForPublication(
    publicationId: string,
    tenantId: string
  ): Promise<AcknowledgementEntity[]> {
    return this.acknowledgmentRepository.find({
      where: {publicationId, tenantId},
      order: {acknowledgedAt: 'DESC'}
    });
  }

  /**
   * Get acknowledgment statistics for a publication
   */
  async getAcknowledgmentStatistics(
    publicationId: string,
    tenantId: string
  ): Promise<{
    total: number;
    complete: number;
    incomplete: number;
    overdue: number;
    averageCompleteness: number;
    quizStats?: {
      required: number;
      completed: number;
      passed: number;
      averageScore: number;
    };
  }> {
    const acknowledgments = await this.getAcknowledgmentsForPublication(publicationId, tenantId);

    const complete = acknowledgments.filter(ack => ack.isComplete).length;
    const overdue = acknowledgments.filter(ack => ack.isOverdue).length;
    const avgCompleteness = acknowledgments.reduce((sum, ack) => sum + ack.completenessScore, 0) / acknowledgments.length || 0;

    const quizAcknowledgments = acknowledgments.filter(ack => ack.quizRequired);
    const quizStats = quizAcknowledgments.length > 0 ? {
      required: quizAcknowledgments.length,
      completed: quizAcknowledgments.filter(ack => ack.quizResults && ack.quizResults.length > 0).length,
      passed: quizAcknowledgments.filter(ack => ack.quizPassed).length,
      averageScore: quizAcknowledgments.reduce((sum, ack) => sum + (ack.quizScore || 0), 0) / quizAcknowledgments.length
    } : undefined;

    return {
      total: acknowledgments.length,
      complete,
      incomplete: acknowledgments.length - complete,
      overdue,
      averageCompleteness: Math.round(avgCompleteness),
      quizStats
    };
  }

  /**
   * Calculate minimum reading time based on content
   */
  private calculateMinimumReadingTime(version: any): number {
    if (!version) return 0;

    // Estimate reading time: ~200 words per minute
    const wordsPerMinute = 200;

    let totalWords = 0;

    // Count words in different sections
    if (version.purpose) totalWords += this.countWords(version.purpose);
    if (version.scope) totalWords += this.countWords(version.scope);
    if (version.responsibilities) totalWords += this.countWords(version.responsibilities);

    // Count words in steps
    if (version.steps) {
      totalWords += version.steps.reduce((sum: number, step: any) =>
        sum + this.countWords(step.description), 0);
    }

    // Calculate minimum time (in seconds)
    const estimatedMinutes = Math.ceil(totalWords / wordsPerMinute);
    return Math.max(60, estimatedMinutes * 60); // Minimum 1 minute
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  /**
   * Validate acknowledgment legality
   */
  private validateAcknowledgmentLegality(
    createDto: CreateAcknowledgmentDto,
    minimumReadingTime: number
  ): boolean {
    // Basic validation checks
    if (!createDto.confirmedUnderstanding) return false;
    if (!createDto.userFullName || !createDto.userEmail) return false;
    if (!createDto.ipAddress || !createDto.deviceInfo) return false;

    // Reading time validation
    if (createDto.readingTime && minimumReadingTime) {
      if (createDto.readingTime < minimumReadingTime * 0.5) { // Allow 50% margin
        return false;
      }
    }

    return true;
  }

  /**
   * Perform acknowledgment validation
   */
  private performAcknowledgmentValidation(acknowledgment: AcknowledgementEntity): AcknowledgmentValidation {
    const missingRequirements: string[] = [];
    const warnings: string[] = [];

    // Check basic requirements
    if (!acknowledgment.confirmedUnderstanding) {
      missingRequirements.push('Confirmación de comprensión requerida');
    }

    // Check reading time
    if (acknowledgment.minimumReadingTime && acknowledgment.readingTime) {
      if (acknowledgment.readingTime < acknowledgment.minimumReadingTime) {
        warnings.push('Tiempo de lectura insuficiente');
      }
    }

    // Check quiz requirements
    if (acknowledgment.quizRequired && !acknowledgment.quizPassed) {
      missingRequirements.push('Quiz requerido no aprobado');
    }

    // Check electronic consent requirements
    if (acknowledgment.econsentRequired && !acknowledgment.econsentId) {
      missingRequirements.push('Consentimiento electrónico requerido');
    }

    return {
      isValid: missingRequirements.length === 0,
      completenessScore: acknowledgment.completenessScore,
      missingRequirements,
      warnings
    };
  }

  /**
   * Perform system validation for electronic consent
   */
  private performSystemValidation(econsent: EConsentEntity): {
    certificateValid: boolean;
    timestampValid: boolean;
    signatureValid: boolean;
    biometricValid?: boolean;
    validationTime: Date;
    validationErrors?: string[];
  } {
    const errors: string[] = [];
    let certificateValid = true;
    let timestampValid = true;
    let signatureValid = true;

    // Validate certificate for FEA
    if (econsent.consentType === EConsentType.ADVANCED) {
      if (!econsent.digitalCertificate) {
        certificateValid = false;
        errors.push('Certificado digital requerido para FEA');
      } else if (new Date() > econsent.digitalCertificate.validTo) {
        certificateValid = false;
        errors.push('Certificado digital expirado');
      }

      if (!econsent.digitalSignature) {
        signatureValid = false;
        errors.push('Firma digital requerida para FEA');
      }

      if (!econsent.qualifiedTimestamp) {
        timestampValid = false;
        errors.push('Timestamp cualificado requerido para FEA');
      }
    }

    return {
      certificateValid,
      timestampValid,
      signatureValid,
      validationTime: new Date(),
      validationErrors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Update publication statistics
   */
  private async updatePublicationStatistics(publicationId: string): Promise<void> {
    const publication = await this.publicationRepository.findOne({
      where: {id: publicationId}
    });

    if (!publication) return;

    const acknowledgments = await this.acknowledgmentRepository.find({
      where: {publicationId}
    });

    const acknowledgementsReceived = acknowledgments.length;
    const totalTargetUsers = publication.statistics?.totalTargetUsers || 0;
    const acknowledgementsPercentage = totalTargetUsers > 0
      ? Math.round((acknowledgementsReceived / totalTargetUsers) * 100)
      : 0;

    await this.publicationRepository.update(publicationId, {
      statistics: {
        ...publication.statistics,
        acknowledgementsReceived,
        acknowledgementsPercentage,
        lastUpdated: new Date()
      }
    });
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
