import { Column, Entity, Index } from 'typeorm';
import { TenantAbstractEntity }  from '@shared/domain/entities/tenantAbstractEntity';
import { AuditAction }           from '../enums';

/**
 * Interface for audit context information
 */
export interface AuditContext {
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  geoLocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Interface for changed data tracking
 */
export interface DataChange {
  field: string;
  oldValue?: any;
  newValue?: any;
  dataType: string;
  sensitive?: boolean; // For PII/sensitive data masking
}

/**
 * Interface for legal compliance information
 */
export interface ComplianceInfo {
  applicableLaws: string[];
  complianceLevel: 'BASIC' | 'STANDARD' | 'ENHANCED' | 'CRITICAL';
  dataRetentionYears: number;
  legalBasis: string;
  processingPurpose: string;
  dataSubjectRights?: string[];
}

/**
 * Audit entity for comprehensive tracking of all procedure-related actions
 * Implements Chilean legal compliance requirements for data retention and traceability
 */
@Entity('procedure_audits')
@Index([ 'entityType', 'entityId', 'action' ])
@Index([ 'userId', 'action', 'timestamp' ])
@Index([ 'tenantId', 'timestamp' ])
@Index([ 'action', 'timestamp' ])
export class AuditEntity extends TenantAbstractEntity {
  /**
   * Action that was performed
   */
  @Column({
    name: 'action',
    type: 'enum',
    enum: AuditAction
  })
  action: AuditAction;

  /**
   * Type of entity that was affected
   */
  @Column({name: 'entity_type', type: 'varchar', length: 100})
  entityType: string;

  /**
   * ID of the affected entity
   */
  @Column({name: 'entity_id', type: 'uuid'})
  entityId: string;

  /**
   * User who performed the action
   */
  @Column({name: 'user_id', type: 'uuid'})
  userId: string;

  /**
   * User's full name at the time of action
   */
  @Column({name: 'user_full_name', type: 'varchar', length: 200})
  userFullName: string;

  /**
   * User's email at the time of action
   */
  @Column({name: 'user_email', type: 'varchar', length: 255})
  userEmail: string;

  /**
   * User's role/permissions at the time of action
   */
  @Column({name: 'user_role', type: 'varchar', length: 100, nullable: true})
  userRole?: string;

  /**
   * Department/area of the user
   */
  @Column({name: 'user_department', type: 'varchar', length: 200, nullable: true})
  userDepartment?: string;

  /**
   * Timestamp when the action occurred
   */
  @Column({name: 'timestamp', type: 'timestamptz'})
  timestamp: Date;

  /**
   * Brief description of the action
   */
  @Column({name: 'description', type: 'text'})
  description: string;

  /**
   * Detailed changes made (before/after values)
   */
  @Column({name: 'changes', type: 'jsonb', nullable: true})
  changes?: DataChange[];

  /**
   * Previous state of the entity (if applicable)
   */
  @Column({name: 'previous_state', type: 'jsonb', nullable: true})
  previousState?: Record<string, any>;

  /**
   * New state of the entity (if applicable)
   */
  @Column({name: 'new_state', type: 'jsonb', nullable: true})
  newState?: Record<string, any>;

  /**
   * Context information about the request
   */
  @Column({name: 'context', type: 'jsonb', nullable: true})
  context?: AuditContext;

  /**
   * Source system or module that initiated the action
   */
  @Column({name: 'source_system', type: 'varchar', length: 100, default: 'procedures-module'})
  sourceSystem: string;

  /**
   * Severity level of this audit event
   */
  @Column({
    name: 'severity',
    type: 'enum',
    enum: [ 'INFO', 'WARNING', 'ERROR', 'CRITICAL' ],
    default: 'INFO'
  })
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

  /**
   * Whether this action was successful
   */
  @Column({name: 'success', type: 'boolean', default: true})
  success: boolean;

  /**
   * Error message if action failed
   */
  @Column({name: 'error_message', type: 'text', nullable: true})
  errorMessage?: string;

  /**
   * Error code if action failed
   */
  @Column({name: 'error_code', type: 'varchar', length: 50, nullable: true})
  errorCode?: string;

  /**
   * Duration of the action in milliseconds
   */
  @Column({name: 'duration_ms', type: 'int', nullable: true})
  durationMs?: number;

  /**
   * Related entities affected by this action
   */
  @Column({name: 'related_entities', type: 'jsonb', default: []})
  relatedEntities: Array<{
    entityType: string;
    entityId: string;
    relationshipType: string;
  }>;

  /**
   * Business impact of this action
   */
  @Column({name: 'business_impact', type: 'jsonb', nullable: true})
  businessImpact?: {
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedUsers?: number;
    affectedDepartments?: string[];
    complianceImpact?: string;
    financialImpact?: number;
  };

  /**
   * Legal compliance information
   */
  @Column({name: 'compliance_info', type: 'jsonb', nullable: true})
  complianceInfo?: ComplianceInfo;

  /**
   * Digital signature of the audit record (for integrity)
   */
  @Column({name: 'record_signature', type: 'text', nullable: true})
  recordSignature?: string;

  /**
   * Hash of the audit record for tamper detection
   */
  @Column({name: 'record_hash', type: 'varchar', length: 128, nullable: true})
  recordHash?: string;

  /**
   * Tags for categorization and filtering
   */
  @Column({name: 'tags', type: 'varchar', array: true, default: []})
  tags: string[];

  /**
   * Additional metadata
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;

  /**
   * Whether this audit record should be archived
   */
  @Column({name: 'should_archive', type: 'boolean', default: false})
  shouldArchive: boolean;

  /**
   * Date when this record should be archived
   */
  @Column({name: 'archive_date', type: 'timestamptz', nullable: true})
  archiveDate?: Date;

  /**
   * Whether this record has been archived
   */
  @Column({name: 'is_archived', type: 'boolean', default: false})
  isArchived: boolean;

  /**
   * Legal hold information (prevents deletion/archiving)
   */
  @Column({name: 'legal_hold', type: 'jsonb', nullable: true})
  legalHold?: {
    isActive: boolean;
    reason: string;
    holdBy: string;
    holdDate: Date;
    expectedRelease?: Date;
    caseNumber?: string;
  };

  /**
   * Anonymization status (for GDPR-like compliance)
   */
  @Column({name: 'anonymization_status', type: 'jsonb', nullable: true})
  anonymizationStatus?: {
    isAnonymized: boolean;
    anonymizedAt?: Date;
    anonymizedBy?: string;
    anonymizationMethod?: string;
    retainedFields?: string[];
  };


  /**
   * Get age of audit record in days
   */
  get ageInDays(): number {
    const now = new Date();
    const auditDate = new Date(this.timestamp);
    const diffTime = now.getTime() - auditDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if record is eligible for archiving
   */
  get isEligibleForArchiving(): boolean {
    if (this.isArchived || this.legalHold?.isActive) {
      return false;
    }

    if (this.archiveDate) {
      return new Date() >= this.archiveDate;
    }

    // Default archiving based on compliance requirements
    const defaultRetentionDays = this.complianceInfo?.dataRetentionYears
      ? this.complianceInfo.dataRetentionYears * 365
      : 2555; // Default 7 years for Chilean labor law compliance

    return this.ageInDays >= defaultRetentionDays;
  }

  /**
   * Check if record contains sensitive information
   */
  get containsSensitiveData(): boolean {
    return !!(this.changes?.some(change => change.sensitive) ||
      this.metadata?.containsPII ||
      this.tags.includes('PII') ||
      this.tags.includes('sensitive'));
  }

  /**
   * Get compliance risk level
   */
  get complianceRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.severity === 'CRITICAL' || this.businessImpact?.impactLevel === 'CRITICAL') {
      return 'CRITICAL';
    }

    if (this.severity === 'ERROR' || this.businessImpact?.impactLevel === 'HIGH') {
      return 'HIGH';
    }

    if (this.severity === 'WARNING' || this.containsSensitiveData) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Generate audit summary for reporting
   */
  getAuditSummary(): {
    action: string;
    entity: string;
    user: string;
    timestamp: Date;
    success: boolean;
    impact: string;
    compliance: string;
  } {
    return {
      action: this.action,
      entity: `${ this.entityType }:${ this.entityId }`,
      user: `${ this.userFullName } (${ this.userEmail })`,
      timestamp: this.timestamp,
      success: this.success,
      impact: this.businessImpact?.impactLevel || 'LOW',
      compliance: this.complianceInfo?.complianceLevel || 'BASIC'
    };
  }

  /**
   * Check if record meets legal retention requirements
   */
  meetsRetentionRequirements(): boolean {
    if (this.legalHold?.isActive) {
      return true; // Must be retained due to legal hold
    }

    const retentionYears = this.complianceInfo?.dataRetentionYears || 7; // Chilean labor law default
    const maxRetentionDays = retentionYears * 365;

    return this.ageInDays <= maxRetentionDays;
  }
}
