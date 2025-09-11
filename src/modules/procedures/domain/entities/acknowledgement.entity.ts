import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TenantAbstractEntity }                            from '@shared/domain/entities/tenantAbstractEntity';
import { PublicationEntity }                               from './publication.entity';
import { EConsentEntity }                                  from './econsent.entity';

/**
 * Interface for quiz results
 */
export interface QuizResult {
  questionIndex: number;
  question: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

/**
 * Interface for device information
 */
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  isMobile: boolean;
  screenResolution: string;
  timezone: string;
}

/**
 * Acknowledgement entity for tracking worker confirmations
 * Implements Chilean legal requirements for procedure acknowledgment
 */
@Entity('procedure_acknowledgements')
export class AcknowledgementEntity extends TenantAbstractEntity {
  /**
   * Reference to the publication being acknowledged
   */
  @ManyToOne(() => PublicationEntity, publication => publication.acknowledgments, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({name: 'publication_id'})
  publication: PublicationEntity;

  @Column({name: 'publication_id', type: 'uuid'})
  publicationId: string;

  /**
   * User who made the acknowledgment
   */
  @Column({name: 'user_id', type: 'uuid'})
  userId: string;

  /**
   * User's full name at the time of acknowledgment
   */
  @Column({name: 'user_full_name', type: 'varchar', length: 200})
  userFullName: string;

  /**
   * User's email at the time of acknowledgment
   */
  @Column({name: 'user_email', type: 'varchar', length: 255})
  userEmail: string;

  /**
   * User's department at the time of acknowledgment
   */
  @Column({name: 'user_department', type: 'varchar', length: 200, nullable: true})
  userDepartment?: string;

  /**
   * User's role/position at the time of acknowledgment
   */
  @Column({name: 'user_role', type: 'varchar', length: 100, nullable: true})
  userRole?: string;

  /**
   * User's employee ID or RUT
   */
  @Column({name: 'user_employee_id', type: 'varchar', length: 50, nullable: true})
  userEmployeeId?: string;

  /**
   * Date and time when acknowledgment was made
   */
  @Column({name: 'acknowledged_at', type: 'timestamptz'})
  acknowledgedAt: Date;

  /**
   * IP address of the user when acknowledgment was made
   */
  @Column({name: 'ip_address', type: 'inet'})
  ipAddress: string;

  /**
   * Geographic location based on IP (optional)
   */
  @Column({name: 'geo_location', type: 'jsonb', nullable: true})
  geoLocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };

  /**
   * Device and browser information
   */
  @Column({name: 'device_info', type: 'jsonb'})
  deviceInfo: DeviceInfo;

  /**
   * Whether the user confirmed they read and understood the procedure
   */
  @Column({name: 'confirmed_understanding', type: 'boolean', default: true})
  confirmedUnderstanding: boolean;

  /**
   * Time spent reading the procedure (in seconds)
   */
  @Column({name: 'reading_time', type: 'int', nullable: true})
  readingTime?: number;

  /**
   * Minimum required reading time (in seconds)
   */
  @Column({name: 'minimum_reading_time', type: 'int', nullable: true})
  minimumReadingTime?: number;

  /**
   * Whether quiz was required for this acknowledgment
   */
  @Column({name: 'quiz_required', type: 'boolean', default: false})
  quizRequired: boolean;

  /**
   * Quiz results if quiz was taken
   */
  @Column({name: 'quiz_results', type: 'jsonb', nullable: true})
  quizResults?: QuizResult[];

  /**
   * Overall quiz score (percentage)
   */
  @Column({name: 'quiz_score', type: 'decimal', precision: 5, scale: 2, nullable: true})
  quizScore?: number;

  /**
   * Minimum passing score required
   */
  @Column({name: 'quiz_passing_score', type: 'decimal', precision: 5, scale: 2, nullable: true})
  quizPassingScore?: number;

  /**
   * Whether the user passed the quiz
   */
  @Column({name: 'quiz_passed', type: 'boolean', nullable: true})
  quizPassed?: boolean;

  /**
   * Number of quiz attempts made
   */
  @Column({name: 'quiz_attempts', type: 'int', default: 0})
  quizAttempts: number;

  /**
   * Maximum number of quiz attempts allowed
   */
  @Column({name: 'max_quiz_attempts', type: 'int', default: 3})
  maxQuizAttempts: number;

  /**
   * Whether electronic consent was required
   */
  @Column({name: 'econsent_required', type: 'boolean', default: false})
  econsentRequired: boolean;

  /**
   * Reference to electronic consent if provided
   */
  @OneToOne(() => EConsentEntity, {nullable: true})
  @JoinColumn({name: 'econsent_id'})
  econsent?: EConsentEntity;

  @Column({name: 'econsent_id', type: 'uuid', nullable: true})
  econsentId?: string;

  /**
   * Session ID for tracking the acknowledgment session
   */
  @Column({name: 'session_id', type: 'varchar', length: 100, nullable: true})
  sessionId?: string;

  /**
   * Referrer URL (how the user accessed the procedure)
   */
  @Column({name: 'referrer_url', type: 'varchar', length: 500, nullable: true})
  referrerUrl?: string;

  /**
   * Whether this acknowledgment was mandatory
   */
  @Column({name: 'is_mandatory', type: 'boolean', default: true})
  isMandatory: boolean;

  /**
   * Deadline for this acknowledgment
   */
  @Column({name: 'acknowledgment_deadline', type: 'timestamptz', nullable: true})
  acknowledgmentDeadline?: Date;

  /**
   * Whether this acknowledgment was made after the deadline
   */
  @Column({name: 'is_late', type: 'boolean', default: false})
  isLate: boolean;

  /**
   * Reason for late acknowledgment
   */
  @Column({name: 'late_reason', type: 'text', nullable: true})
  lateReason?: string;

  /**
   * Additional comments from the user
   */
  @Column({name: 'user_comments', type: 'text', nullable: true})
  userComments?: string;

  /**
   * Supervisor or manager who validated this acknowledgment (if required)
   */
  @Column({name: 'validated_by', type: 'uuid', nullable: true})
  validatedBy?: string;

  /**
   * Date when acknowledgment was validated
   */
  @Column({name: 'validated_at', type: 'timestamptz', nullable: true})
  validatedAt?: Date;

  /**
   * Validation comments
   */
  @Column({name: 'validation_comments', type: 'text', nullable: true})
  validationComments?: string;

  /**
   * Whether this acknowledgment is valid for legal purposes
   */
  @Column({name: 'is_legally_valid', type: 'boolean', default: true})
  isLegallyValid: boolean;

  /**
   * Reason if acknowledgment is not legally valid
   */
  @Column({name: 'invalidity_reason', type: 'text', nullable: true})
  invalidityReason?: string;

  /**
   * Reminder notifications sent to user
   */
  @Column({name: 'reminders_sent', type: 'timestamptz', array: true, default: []})
  remindersSent: Date[];

  /**
   * Metadata for additional information
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;


  /**
   * Check if acknowledgment is overdue
   */
  get isOverdue(): boolean {
    if (!this.acknowledgmentDeadline) return false;
    return new Date() > this.acknowledgmentDeadline;
  }

  /**
   * Check if user can retake quiz
   */
  get canRetakeQuiz(): boolean {
    return this.quizRequired &&
      this.quizAttempts < this.maxQuizAttempts &&
      (this.quizPassed === null || this.quizPassed === false);
  }

  /**
   * Get acknowledgment completeness score (0-100)
   */
  get completenessScore(): number {
    let score = 0;
    const totalPoints = 5;

    // Basic acknowledgment
    if (this.confirmedUnderstanding) score += 1;

    // Reading time compliance
    if (this.minimumReadingTime && this.readingTime && this.readingTime >= this.minimumReadingTime) {
      score += 1;
    } else if (!this.minimumReadingTime) {
      score += 1; // No minimum required
    }

    // Quiz completion (if required)
    if (this.quizRequired) {
      if (this.quizPassed) score += 2;
    } else {
      score += 2; // No quiz required
    }

    // Electronic consent (if required)
    if (this.econsentRequired) {
      if (this.econsentId) score += 1;
    } else {
      score += 1; // No e-consent required
    }

    return Math.round((score / totalPoints) * 100);
  }

  /**
   * Check if acknowledgment meets all requirements
   */
  get isComplete(): boolean {
    return this.completenessScore === 100;
  }

  /**
   * Get days since acknowledgment
   */
  get daysSinceAcknowledgment(): number {
    const now = new Date();
    const acknowledgedDate = new Date(this.acknowledgedAt);
    const diffTime = now.getTime() - acknowledgedDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
