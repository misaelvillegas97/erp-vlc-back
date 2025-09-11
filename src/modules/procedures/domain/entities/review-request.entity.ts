import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantAbstractEntity }                  from '@shared/domain/entities/tenantAbstractEntity';
import { ReviewRole, ReviewStatus }              from '../enums';
import { ProcedureVersionEntity }                from './procedure-version.entity';

/**
 * Review request entity for procedure approval workflow
 * Implements Chilean legal compliance review process:
 * Author → Supervisor → Risk Prevention/Joint Committee → HR/Legal
 */
@Entity('procedure_review_requests')
export class ReviewRequestEntity extends TenantAbstractEntity {
  /**
   * Reference to the procedure version being reviewed
   */
  @ManyToOne(() => ProcedureVersionEntity, version => version.reviews, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({name: 'version_id'})
  version: ProcedureVersionEntity;

  @Column({name: 'version_id', type: 'uuid'})
  versionId: string;

  /**
   * User who requested the review (usually the author or previous reviewer)
   */
  @Column({name: 'requested_by', type: 'uuid'})
  requestedBy: string;

  /**
   * User assigned to perform the review
   */
  @Column({name: 'reviewer_id', type: 'uuid'})
  reviewerId: string;

  /**
   * Role of the reviewer in the approval workflow
   */
  @Column({
    name: 'reviewer_role',
    type: 'enum',
    enum: ReviewRole
  })
  reviewerRole: ReviewRole;

  /**
   * Current status of the review
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING
  })
  status: ReviewStatus;

  /**
   * Review comments from the reviewer
   */
  @Column({name: 'comments', type: 'text', nullable: true})
  comments?: string;

  /**
   * Specific sections that need attention (optional)
   */
  @Column({name: 'sections_to_review', type: 'varchar', array: true, default: []})
  sectionsToReview: string[];

  /**
   * Detailed feedback by section
   */
  @Column({name: 'section_feedback', type: 'jsonb', nullable: true})
  sectionFeedback?: Record<string, {
    comment: string;
    status: 'APPROVED' | 'NEEDS_CHANGES' | 'REJECTED';
    suggestions?: string[];
  }>;

  /**
   * Priority level for this review
   */
  @Column({
    name: 'priority',
    type: 'enum',
    enum: [ 'LOW', 'MEDIUM', 'HIGH', 'URGENT' ],
    default: 'MEDIUM'
  })
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  /**
   * Due date for the review
   */
  @Column({name: 'due_date', type: 'timestamptz', nullable: true})
  dueDate?: Date;

  /**
   * Date when the review was completed
   */
  @Column({name: 'reviewed_at', type: 'timestamptz', nullable: true})
  reviewedAt?: Date;

  /**
   * Sequence number in the approval workflow
   */
  @Column({name: 'sequence_number', type: 'int'})
  sequenceNumber: number;

  /**
   * Whether this review is required by law
   */
  @Column({name: 'is_legal_requirement', type: 'boolean', default: false})
  isLegalRequirement: boolean;

  /**
   * Legal justification for required review
   */
  @Column({name: 'legal_justification', type: 'text', nullable: true})
  legalJustification?: string;

  /**
   * Whether reviewer can delegate this review
   */
  @Column({name: 'can_delegate', type: 'boolean', default: false})
  canDelegate: boolean;

  /**
   * If delegated, the original reviewer ID
   */
  @Column({name: 'delegated_from', type: 'uuid', nullable: true})
  delegatedFrom?: string;

  /**
   * Reminder dates sent to reviewer
   */
  @Column({name: 'reminders_sent', type: 'timestamptz', array: true, default: []})
  remindersSent: Date[];

  /**
   * Additional context or instructions for the reviewer
   */
  @Column({name: 'reviewer_instructions', type: 'text', nullable: true})
  reviewerInstructions?: string;

  /**
   * Files or documents attached to this review
   */
  @Column({name: 'attachments', type: 'jsonb', default: []})
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
    uploadedAt: Date;
  }>;

  /**
   * Estimated time required for review (in minutes)
   */
  @Column({name: 'estimated_review_time', type: 'int', nullable: true})
  estimatedReviewTime?: number;

  /**
   * Actual time spent on review (in minutes)
   */
  @Column({name: 'actual_review_time', type: 'int', nullable: true})
  actualReviewTime?: number;

  /**
   * IP address of reviewer when review was completed (for audit)
   */
  @Column({name: 'reviewer_ip', type: 'inet', nullable: true})
  reviewerIp?: string;

  /**
   * User agent of reviewer's browser (for audit)
   */
  @Column({name: 'reviewer_user_agent', type: 'text', nullable: true})
  reviewerUserAgent?: string;

  /**
   * Metadata for additional information
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;


  /**
   * Check if this review is overdue
   */
  get isOverdue(): boolean {
    return this.dueDate ? new Date() > this.dueDate && this.status === ReviewStatus.PENDING : false;
  }

  /**
   * Check if this review can be completed by the current status
   */
  get canBeCompleted(): boolean {
    return this.status === ReviewStatus.PENDING;
  }

  /**
   * Get the next reviewer role in the workflow
   */
  get nextReviewerRole(): ReviewRole | null {
    const workflow = [
      ReviewRole.AUTHOR,
      ReviewRole.SUPERVISOR,
      ReviewRole.RISK_PREVENTION,
      ReviewRole.JOINT_COMMITTEE,
      ReviewRole.HR_LEGAL
    ];

    const currentIndex = workflow.indexOf(this.reviewerRole);
    return currentIndex < workflow.length - 1 ? workflow[currentIndex + 1] : null;
  }
}
