import { Column, Entity }       from 'typeorm';
import { TenantAbstractEntity } from '@shared/domain/entities/tenantAbstractEntity';
import { EConsentType }         from '../enums';

/**
 * Interface for digital certificate information
 */
export interface DigitalCertificate {
  issuer: string;
  subject: string;
  serialNumber: string;
  thumbprint: string;
  validFrom: Date;
  validTo: Date;
  algorithm: string;
  keySize: number;
  certificateChain?: string[];
}

/**
 * Interface for biometric data (if supported)
 */
export interface BiometricData {
  type: 'FINGERPRINT' | 'FACIAL' | 'VOICE' | 'SIGNATURE_DYNAMICS';
  template: string; // Encrypted biometric template
  confidence: number; // Match confidence (0-100)
  captureTime: Date;
  deviceInfo: string;
}

/**
 * Interface for signature metadata
 */
export interface SignatureMetadata {
  signatureFormat: string; // PKCS#7, XMLDSig, etc.
  hashAlgorithm: string;
  timestampAuthority?: string;
  signaturePolicy?: string;
  location?: string;
  reason?: string;
  contactInfo?: string;
}

/**
 * Electronic Consent entity for Chilean legal compliance
 * Implements Ley 19.799 requirements for electronic signatures
 */
@Entity('procedure_econsents')
export class EConsentEntity extends TenantAbstractEntity {
  /**
   * User who provided the electronic consent
   */
  @Column({name: 'user_id', type: 'uuid'})
  userId: string;

  /**
   * User's full name at the time of consent
   */
  @Column({name: 'user_full_name', type: 'varchar', length: 200})
  userFullName: string;

  /**
   * User's email at the time of consent
   */
  @Column({name: 'user_email', type: 'varchar', length: 255})
  userEmail: string;

  /**
   * User's RUT (Chilean national ID) for legal identification
   */
  @Column({name: 'user_rut', type: 'varchar', length: 12})
  userRut: string;

  /**
   * Type of electronic consent/signature
   */
  @Column({
    name: 'consent_type',
    type: 'enum',
    enum: EConsentType
  })
  consentType: EConsentType;

  /**
   * Date and time when consent was given
   */
  @Column({name: 'consented_at', type: 'timestamptz'})
  consentedAt: Date;

  /**
   * IP address from which consent was given
   */
  @Column({name: 'ip_address', type: 'inet'})
  ipAddress: string;

  /**
   * User agent string for device identification
   */
  @Column({name: 'user_agent', type: 'text'})
  userAgent: string;

  /**
   * Geographic location based on IP
   */
  @Column({name: 'geo_location', type: 'jsonb', nullable: true})
  geoLocation?: {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };

  /**
   * Text that was consented to (procedure content hash)
   */
  @Column({name: 'consented_text_hash', type: 'varchar', length: 128})
  consentedTextHash: string;

  /**
   * Hashing algorithm used
   */
  @Column({name: 'hash_algorithm', type: 'varchar', length: 50, default: 'SHA-256'})
  hashAlgorithm: string;

  /**
   * Digital signature (for FEA - Advanced Electronic Signature)
   */
  @Column({name: 'digital_signature', type: 'text', nullable: true})
  digitalSignature?: string;

  /**
   * Digital certificate information (for FEA)
   */
  @Column({name: 'digital_certificate', type: 'jsonb', nullable: true})
  digitalCertificate?: DigitalCertificate;

  /**
   * Timestamp from qualified timestamp authority
   */
  @Column({name: 'qualified_timestamp', type: 'text', nullable: true})
  qualifiedTimestamp?: string;

  /**
   * Timestamp authority information
   */
  @Column({name: 'timestamp_authority', type: 'jsonb', nullable: true})
  timestampAuthority?: {
    name: string;
    url: string;
    certificate: string;
  };

  /**
   * Biometric data (if captured)
   */
  @Column({name: 'biometric_data', type: 'jsonb', nullable: true})
  biometricData?: BiometricData;

  /**
   * Signature metadata
   */
  @Column({name: 'signature_metadata', type: 'jsonb', nullable: true})
  signatureMetadata?: SignatureMetadata;

  /**
   * Session ID for tracking the consent session
   */
  @Column({name: 'session_id', type: 'varchar', length: 100})
  sessionId: string;

  /**
   * Whether user explicitly consented to electronic documentation
   */
  @Column({name: 'explicit_consent', type: 'boolean', default: true})
  explicitConsent: boolean;

  /**
   * Consent text shown to user
   */
  @Column({name: 'consent_text', type: 'text'})
  consentText: string;

  /**
   * Language of the consent
   */
  @Column({name: 'consent_language', type: 'varchar', length: 10, default: 'es-CL'})
  consentLanguage: string;

  /**
   * Whether this consent is legally valid
   */
  @Column({name: 'is_legally_valid', type: 'boolean', default: true})
  isLegallyValid: boolean;

  /**
   * Reason if consent is not legally valid
   */
  @Column({name: 'invalidity_reason', type: 'text', nullable: true})
  invalidityReason?: string;

  /**
   * Validation performed by the system
   */
  @Column({name: 'system_validation', type: 'jsonb', nullable: true})
  systemValidation?: {
    certificateValid: boolean;
    timestampValid: boolean;
    signatureValid: boolean;
    biometricValid?: boolean;
    validationTime: Date;
    validationErrors?: string[];
  };

  /**
   * Legal context for this consent
   */
  @Column({name: 'legal_context', type: 'jsonb', nullable: true})
  legalContext?: {
    applicableLaws: string[];
    legalBasis: string;
    dataProcessingPurpose: string;
    retentionPeriod?: number; // in years
  };

  /**
   * Revocation information (if consent was revoked)
   */
  @Column({name: 'revocation_info', type: 'jsonb', nullable: true})
  revocationInfo?: {
    revokedAt: Date;
    revokedBy: string;
    revocationReason: string;
    revocationMethod: string;
  };

  /**
   * Audit trail for this consent
   */
  @Column({name: 'audit_trail', type: 'jsonb', default: []})
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    userId?: string;
    ipAddress?: string;
    details?: string;
  }>;

  /**
   * Related documents or procedures
   */
  @Column({name: 'related_documents', type: 'jsonb', default: []})
  relatedDocuments: Array<{
    documentId: string;
    documentType: string;
    documentTitle: string;
    documentHash: string;
  }>;

  /**
   * Backup verification methods used
   */
  @Column({name: 'backup_verification', type: 'jsonb', nullable: true})
  backupVerification?: {
    methods: string[];
    verificationTime: Date;
    verificationResults: Record<string, boolean>;
  };

  /**
   * Metadata for additional information
   */
  @Column({name: 'metadata', type: 'jsonb', nullable: true})
  metadata?: Record<string, any>;


  /**
   * Check if the consent is still valid
   */
  get isValid(): boolean {
    if (!this.isLegallyValid) return false;
    if (this.revocationInfo) return false;

    // Check certificate expiry for FEA
    if (this.consentType === EConsentType.ADVANCED && this.digitalCertificate) {
      return new Date() <= this.digitalCertificate.validTo;
    }

    return true;
  }

  /**
   * Check if consent is expired based on certificate
   */
  get isExpired(): boolean {
    if (this.consentType === EConsentType.ADVANCED && this.digitalCertificate) {
      return new Date() > this.digitalCertificate.validTo;
    }
    return false;
  }

  /**
   * Get consent age in days
   */
  get ageInDays(): number {
    const now = new Date();
    const consentDate = new Date(this.consentedAt);
    const diffTime = now.getTime() - consentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if consent meets Chilean legal requirements
   */
  get meetsLegalRequirements(): boolean {
    // Basic requirements for all electronic signatures
    if (!this.userRut || !this.consentedTextHash || !this.explicitConsent) {
      return false;
    }

    // Additional requirements for FEA
    if (this.consentType === EConsentType.ADVANCED) {
      return !!(this.digitalSignature &&
        this.digitalCertificate &&
        this.qualifiedTimestamp &&
        this.systemValidation?.certificateValid &&
        this.systemValidation?.signatureValid &&
        this.systemValidation?.timestampValid);
    }

    // FES requirements are less strict
    return true;
  }

  /**
   * Get legal compliance score (0-100)
   */
  get legalComplianceScore(): number {
    let score = 0;
    const totalChecks = 10;

    // Basic requirements (4 points)
    if (this.userRut) score += 1;
    if (this.consentedTextHash) score += 1;
    if (this.explicitConsent) score += 1;
    if (this.ipAddress) score += 1;

    // Enhanced requirements (3 points)
    if (this.geoLocation) score += 0.5;
    if (this.sessionId) score += 0.5;
    if (this.consentText) score += 1;
    if (this.auditTrail.length > 0) score += 1;

    // Advanced signature requirements (3 points)
    if (this.consentType === EConsentType.ADVANCED) {
      if (this.digitalSignature) score += 1;
      if (this.digitalCertificate) score += 1;
      if (this.qualifiedTimestamp) score += 1;
    } else {
      score += 3; // FES doesn't need these
    }

    return Math.round((score / totalChecks) * 100);
  }
}
