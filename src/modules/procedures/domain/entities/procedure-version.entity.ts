import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantAbstractEntity }                             from '@shared/domain/entities/tenantAbstractEntity';
import { ProcedureStatus }                                  from '../enums';
import { ProcedureEntity }                                  from './procedure.entity';
import { ReviewRequestEntity }                              from './review-request.entity';
import { PublicationEntity }                                from './publication.entity';
import { FileEntity }                                       from '@modules/files/domain/entities/file.entity';

/**
 * Interface for procedure section content
 */
export interface ProcedureSection {
  title?: string;
  content: string;
  order?: number;
}

/**
 * Interface for legal reference
 */
export interface LegalReference {
  title: string;
  citation: string;
  url?: string;
  articles?: string[];
}

/**
 * Interface for risk and control measures
 */
export interface RiskControl {
  risk: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  controlMeasures: string[];
  responsibleRole?: string;
}

/**
 * Interface for procedure step
 */
export interface ProcedureStep {
  stepNumber: number;
  title: string;
  description: string;
  responsibleRole?: string;
  estimatedTime?: number; // in minutes
  requiredTools?: string[];
  safetyNotes?: string[];
}

/**
 * Specific version of a procedure with all detailed content
 */
@Entity('procedure_versions')
export class ProcedureVersionEntity extends TenantAbstractEntity {
  /**
   * Reference to the main procedure
   */
  @ManyToOne(() => ProcedureEntity, procedure => procedure.versions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({name: 'procedure_id'})
  procedure: ProcedureEntity;

  @Column({name: 'procedure_id', type: 'uuid'})
  procedureId: string;

  /**
   * Version number (1, 2, 3, etc.)
   */
  @Column({name: 'version_number', type: 'int'})
  versionNumber: number;

  /**
   * Title of this specific version
   */
  @Column({name: 'title', type: 'varchar', length: 500})
  title: string;

  /**
   * Content file reference with metadata
   * Contains file information (id and path) and additional metadata
   */
  @ManyToOne(() => FileEntity, {eager: true, cascade: true})
  @JoinColumn({name: 'content_id'})
  content: FileEntity;

  /**
   * Annexes and attachments references - kept as metadata only
   */
  @Column({name: 'annexes', type: 'jsonb', default: []})
  annexes: Array<{
    title: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
  }>;

  /**
   * Content access methods - these will be populated by the file service
   * These are not stored in DB but computed from files
   */
  purpose?: string;
  scope?: string;
  steps?: ProcedureStep[];
  responsibilities?: string;
  additionalSections?: ProcedureSection[];
  risksControls?: RiskControl[];

  /**
   * Legal references for this version
   */
  @Column({name: 'legal_references', type: 'jsonb', default: []})
  legalReferences: LegalReference[];

  /**
   * Status of this specific version
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: ProcedureStatus,
    default: ProcedureStatus.DRAFT
  })
  status: ProcedureStatus;

  /**
   * User who created this version
   */
  @Column({name: 'author_id', type: 'uuid'})
  authorId: string;

  /**
   * Summary of changes from previous version - now stored in file
   * This is a computed property populated from file content
   */
  changeSummary?: string;

  /**
   * Detailed changelog with field-level changes
   */
  @Column({name: 'changelog', type: 'jsonb', nullable: true})
  changelog?: Record<string, {
    oldValue?: any;
    newValue?: any;
    action: 'added' | 'modified' | 'removed';
  }>;

  /**
   * Date when this version becomes effective
   */
  @Column({name: 'effective_date', type: 'timestamptz', nullable: true})
  effectiveDate?: Date;

  /**
   * Date when this version was approved
   */
  @Column({name: 'approved_at', type: 'timestamptz', nullable: true})
  approvedAt?: Date;

  /**
   * User who approved this version
   */
  @Column({name: 'approved_by', type: 'uuid', nullable: true})
  approvedBy?: string;

  /**
   * Whether this is the currently published version
   */
  @Column({name: 'is_current', type: 'boolean', default: false})
  isCurrent: boolean;

  /**
   * Estimated reading time in minutes
   */
  @Column({name: 'estimated_reading_time', type: 'int', nullable: true})
  estimatedReadingTime?: number;

  /**
   * Quiz questions for critical procedures
   */
  @Column({name: 'quiz_questions', type: 'jsonb', nullable: true})
  quizQuestions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }>;

  /**
   * Review requests for this version
   */
  @OneToMany(() => ReviewRequestEntity, review => review.version, {
    cascade: true,
    lazy: true
  })
  reviews: Promise<ReviewRequestEntity[]>;

  /**
   * Publications of this version
   */
  @OneToMany(() => PublicationEntity, publication => publication.version, {
    cascade: true,
    lazy: true
  })
  publications: Promise<PublicationEntity[]>;

}
