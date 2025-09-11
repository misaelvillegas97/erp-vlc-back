/**
 * Enums for the Procedures Module
 * Based on Chilean labor compliance requirements
 */

/**
 * Status of a procedure throughout its lifecycle
 */
export enum ProcedureStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED'
}

/**
 * Status of a review request
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED'
}

/**
 * Review roles according to Chilean legal requirements
 */
export enum ReviewRole {
  AUTHOR = 'AUTHOR',
  SUPERVISOR = 'SUPERVISOR', // Jefatura
  RISK_PREVENTION = 'RISK_PREVENTION', // Prevención de Riesgos
  JOINT_COMMITTEE = 'JOINT_COMMITTEE', // Comité Paritario
  HR_LEGAL = 'HR_LEGAL' // RR.HH./Legal
}

/**
 * Publication status for legal compliance
 */
export enum PublicationStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_NOTICE_SENT = 'PRE_NOTICE_SENT', // 30 days advance notice
  PUBLISHED = 'PUBLISHED',
  DISTRIBUTED = 'DISTRIBUTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED'
}

/**
 * Distribution channels for procedures
 */
export enum DistributionChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PHYSICAL_POSTING = 'PHYSICAL_POSTING' // Required for legal compliance
}

/**
 * Electronic consent types according to Chilean law
 */
export enum EConsentType {
  SIMPLE = 'SIMPLE', // Firma Electrónica Simple (FES)
  ADVANCED = 'ADVANCED' // Firma Electrónica Avanzada (FEA)
}

/**
 * Audit actions for compliance tracking
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PUBLISH = 'PUBLISH',
  DISTRIBUTE = 'DISTRIBUTE',
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  CONSENT = 'CONSENT',
  ARCHIVE = 'ARCHIVE',
  DELETE = 'DELETE'
}

/**
 * Priority levels for procedures
 */
export enum ProcedurePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL' // For safety-critical procedures requiring quiz
}

/**
 * Legal reference categories for Chilean compliance
 */
export enum LegalReferenceCategory {
  LABOR_CODE = 'LABOR_CODE', // Código del Trabajo
  HEALTH_SAFETY = 'HEALTH_SAFETY', // DS 594/1999
  RISK_PREVENTION = 'RISK_PREVENTION', // Ley 16.744, DS 40/1969
  JOINT_COMMITTEE = 'JOINT_COMMITTEE', // DS 54/1969
  INTERNAL_REGULATION = 'INTERNAL_REGULATION', // Arts. 153 y 156 CT
  ELECTRONIC_SIGNATURE = 'ELECTRONIC_SIGNATURE', // Ley 19.799
  DATA_PROTECTION = 'DATA_PROTECTION' // Ley 19.628
}

export enum ProcedureCategory {
  INTERNAL_REGULATION = 'INTERNAL_REGULATION',    // Reglamento Interno
  HEALTH_SAFETY = 'HEALTH_SAFETY',                // SSO - Seguridad y Salud
  OPERATIONAL = 'OPERATIONAL',                     // Operacional
  QUALITY = 'QUALITY'                              // Calidad
}
