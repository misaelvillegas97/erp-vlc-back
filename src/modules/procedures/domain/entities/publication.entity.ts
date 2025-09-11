import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantAbstractEntity }                             from '@shared/domain/entities/tenantAbstractEntity';
import { DistributionChannel, PublicationStatus }           from '../enums';
import { ProcedureVersionEntity }                           from './procedure-version.entity';
import { AcknowledgementEntity }                            from './acknowledgement.entity';

/**
 * Interface for legal evidence required by Chilean law
 */
export interface LegalEvidence {
  type: 'JOINT_COMMITTEE_ACT' | 'POSTING_CONFIRMATION' | 'UNION_NOTIFICATION' | 'EMAIL_CONFIRMATION' | 'OTHER';
  title: string;
  description: string;
  fileUrl?: string;
  witnessName?: string;
  witnessRole?: string;
  evidenceDate: Date;
  location?: string; // For physical postings
  metadata?: Record<string, any>;
}

/**
 * Interface for distribution target audience
 */
export interface DistributionTarget {
  targetType: 'ALL_WORKERS' | 'DEPARTMENT' | 'ROLE' | 'SPECIFIC_USERS' | 'UNIONS' | 'JOINT_COMMITTEE';
  targetIds?: string[]; // User IDs, department IDs, etc.
  targetNames?: string[]; // For display purposes
  channel: DistributionChannel;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
}

/**
 * Publication entity for legal compliance and distribution management
 * Handles Chilean legal requirements for procedure publication
 */
@Entity('procedure_publications')
export class PublicationEntity extends TenantAbstractEntity {
  /**
   * Reference to the procedure version being published
   */
  @ManyToOne(() => ProcedureVersionEntity, version => version.publications, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({name: 'version_id'})
  version: ProcedureVersionEntity;

  @Column({name: 'version_id', type: 'uuid'})
  versionId: string;

  /**
   * User who initiated the publication
   */
  @Column({name: 'published_by', type: 'uuid'})
  publishedBy: string;

  /**
   * Current status of the publication
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.SCHEDULED
  })
  status: PublicationStatus;

  /**
   * Title of the publication (may differ from procedure title)
   */
  @Column({name: 'publication_title', type: 'varchar', length: 500})
  publicationTitle: string;

  /**
   * Date when this publication is scheduled to go live
   */
  @Column({name: 'scheduled_date', type: 'timestamptz'})
  scheduledDate: Date;

  /**
   * Date when the 30-day pre-notice period starts
   * Required for internal regulation changes
   */
  @Column({name: 'pre_notice_start_date', type: 'timestamptz', nullable: true})
  preNoticeStartDate?: Date;

  /**
   * Actual date when the publication went live
   */
  @Column({name: 'published_at', type: 'timestamptz', nullable: true})
  publishedAt?: Date;

  /**
   * Date when the publication becomes effective
   */
  @Column({name: 'effective_date', type: 'timestamptz'})
  effectiveDate: Date;

  /**
   * URL to the generated PDF document
   */
  @Column({name: 'pdf_url', type: 'varchar', length: 1000, nullable: true})
  pdfUrl?: string;

  /**
   * PDF generation metadata
   */
  @Column({name: 'pdf_metadata', type: 'jsonb', nullable: true})
  pdfMetadata?: {
    fileSize: number;
    pageCount: number;
    generatedAt: Date;
    generationTime: number; // in milliseconds
    templateVersion: string;
  };

  /**
   * Distribution targets and their status
   */
  @Column({name: 'distribution_targets', type: 'jsonb', default: []})
  distributionTargets: DistributionTarget[];

  /**
   * Legal evidences collected for compliance
   */
  @Column({name: 'legal_evidences', type: 'jsonb', default: []})
  legalEvidences: LegalEvidence[];

  /**
   * Whether this publication requires 30-day advance notice
   */
  @Column({name: 'requires_pre_notice', type: 'boolean', default: false})
  requiresPreNotice: boolean;

  /**
   * Whether this publication affects union agreements
   */
  @Column({name: 'affects_union_agreements', type: 'boolean', default: false})
  affectsUnionAgreements: boolean;

  /**
   * Whether joint committee approval is required
   */
  @Column({name: 'requires_joint_committee', type: 'boolean', default: false})
  requiresJointCommittee: boolean;

  /**
   * Physical posting locations (required by law)
   */
  @Column({name: 'posting_locations', type: 'jsonb', default: []})
  postingLocations: Array<{
    locationId: string;
    locationName: string;
    address?: string;
    postedAt?: Date;
    removedAt?: Date;
    witnessName?: string;
    witnessSignature?: string;
    photo?: string; // URL to photo evidence
  }>;

  /**
   * Union notifications sent
   */
  @Column({name: 'union_notifications', type: 'jsonb', default: []})
  unionNotifications: Array<{
    unionId: string;
    unionName: string;
    contactEmail?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    acknowledgmentReceived?: boolean;
    acknowledgmentDate?: Date;
    contactPerson?: string;
  }>;

  /**
   * Reminder schedule for employees who haven't acknowledged
   */
  @Column({name: 'reminder_schedule', type: 'jsonb', nullable: true})
  reminderSchedule?: {
    enabled: boolean;
    intervals: number[]; // Days after publication
    lastReminderSent?: Date;
    nextReminderDue?: Date;
  };

  /**
   * Deadline for acknowledgment
   */
  @Column({name: 'acknowledgment_deadline', type: 'timestamptz', nullable: true})
  acknowledgmentDeadline?: Date;

  /**
   * Statistics about distribution and acknowledgment
   */
  @Column({name: 'statistics', type: 'jsonb', nullable: true})
  statistics?: {
    totalTargetUsers: number;
    distributionsSent: number;
    distributionsDelivered: number;
    distributionsFailed: number;
    acknowledgementsReceived: number;
    acknowledgementsPercentage: number;
    lastUpdated: Date;
  };

  /**
   * Publication notes and comments
   */
  @Column({name: 'notes', type: 'text', nullable: true})
  notes?: string;

  /**
   * Cancel reason if publication was cancelled
   */
  @Column({name: 'cancellation_reason', type: 'text', nullable: true})
  cancellationReason?: string;

  /**
   * Date when publication was cancelled
   */
  @Column({name: 'cancelled_at', type: 'timestamptz', nullable: true})
  cancelledAt?: Date;

  /**
   * Metadata for additional information
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;

  /**
   * Acknowledgments received for this publication
   */
  @OneToMany(() => AcknowledgementEntity, ack => ack.publication, {
    cascade: true,
    lazy: true
  })
  acknowledgments: Promise<AcknowledgementEntity[]>;


  /**
   * Check if the pre-notice period is active
   */
  get isPreNoticePeriod(): boolean {
    if (!this.requiresPreNotice || !this.preNoticeStartDate) {
      return false;
    }
    const now = new Date();
    return now >= this.preNoticeStartDate && now < this.scheduledDate;
  }

  /**
   * Check if publication is overdue
   */
  get isOverdue(): boolean {
    return this.scheduledDate && new Date() > this.scheduledDate && this.status === PublicationStatus.SCHEDULED;
  }

  /**
   * Check if acknowledgment deadline has passed
   */
  get isAcknowledgmentOverdue(): boolean {
    return this.acknowledgmentDeadline ? new Date() > this.acknowledgmentDeadline : false;
  }

  /**
   * Get days remaining until effective date
   */
  get daysUntilEffective(): number {
    const now = new Date();
    const effectiveDate = new Date(this.effectiveDate);
    const diffTime = effectiveDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get compliance requirements that are still pending
   */
  get pendingComplianceRequirements(): string[] {
    const pending: string[] = [];

    if (this.requiresPreNotice && !this.preNoticeStartDate) {
      pending.push('30-day pre-notice not scheduled');
    }

    if (this.requiresJointCommittee && !this.legalEvidences.some(e => e.type === 'JOINT_COMMITTEE_ACT')) {
      pending.push('Joint committee approval missing');
    }

    if (this.affectsUnionAgreements && this.unionNotifications.length === 0) {
      pending.push('Union notifications not sent');
    }

    if (this.postingLocations.length < 2) {
      pending.push('Physical posting in at least 2 locations required');
    }

    return pending;
  }
}
