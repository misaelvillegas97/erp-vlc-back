import { Column, Entity, OneToMany }                                                     from 'typeorm';
import { TenantAbstractEntity }                                                          from '@shared/domain/entities/tenantAbstractEntity';
import { LegalReferenceCategory, ProcedureCategory, ProcedurePriority, ProcedureStatus } from '../enums';
import { ProcedureVersionEntity }                                                        from './procedure-version.entity';

/**
 * Main procedure entity that contains the basic information
 * and references to all versions
 */
@Entity('procedures')
export class ProcedureEntity extends TenantAbstractEntity {
  /**
   * Unique code for the procedure (e.g., PROC-001)
   */
  @Column({name: 'code', type: 'varchar', length: 50, unique: true})
  code: string;

  /**
   * Current title of the procedure
   */
  @Column({name: 'title', type: 'varchar', length: 500})
  title: string;

  /**
   * Brief description or purpose of the procedure
   */
  @Column({name: 'description', type: 'text', nullable: true})
  description?: string;

  /**
   * Current status of the procedure
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: ProcedureStatus,
    default: ProcedureStatus.DRAFT
  })
  status: ProcedureStatus;

  /**
   * Priority level for this procedure
   */
  @Column({
    name: 'priority',
    type: 'enum',
    enum: ProcedurePriority,
    default: ProcedurePriority.MEDIUM
  })
  priority: ProcedurePriority;

  /**
   * Department or area this procedure belongs to
   */
  @Column({name: 'department', type: 'varchar', length: 200, nullable: true})
  department?: string;

  /**
   * Current version number (auto-incremented)
   */
  @Column({name: 'current_version', type: 'int', default: 1})
  currentVersion: number;

  /**
   * ID of the user who created this procedure
   */
  @Column({name: 'author_id', type: 'uuid'})
  authorId: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: ProcedureCategory,
    default: ProcedureCategory.HEALTH_SAFETY
  })
  category: ProcedureCategory;

  /**
   * Primary legal references categories
   */
  @Column({
    name: 'legal_categories',
    type: 'enum',
    enum: LegalReferenceCategory,
    array: true,
    default: []
  })
  legalCategories: LegalReferenceCategory[];

  /**
   * Whether this procedure affects internal regulation (requires 30-day notice)
   */
  @Column({name: 'affects_internal_regulation', type: 'boolean', default: false})
  affectsInternalRegulation: boolean;

  /**
   * Whether this procedure requires quiz for acknowledgment
   */
  @Column({name: 'requires_quiz', type: 'boolean', default: false})
  requiresQuiz: boolean;

  /**
   * Tags for categorization and search
   */
  @Column({name: 'tags', type: 'varchar', array: true, default: []})
  tags: string[];

  /**
   * Date when this procedure was first published
   */
  @Column({name: 'first_published_at', type: 'timestamptz', nullable: true})
  firstPublishedAt?: Date;

  /**
   * Date when this procedure was last published
   */
  @Column({name: 'last_published_at', type: 'timestamptz', nullable: true})
  lastPublishedAt?: Date;

  /**
   * Date when this procedure expires or needs review
   */
  @Column({name: 'expires_at', type: 'timestamptz', nullable: true})
  expiresAt?: Date;

  /**
   * Metadata for additional information
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;

  /**
   * All versions of this procedure
   */
  @OneToMany(() => ProcedureVersionEntity, version => version.procedure, {
    cascade: true,
    lazy: true
  })
  versions: Promise<ProcedureVersionEntity[]>;

}
