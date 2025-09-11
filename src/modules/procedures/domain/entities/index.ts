/**
 * Export all procedure domain entities
 */
export { ProcedureEntity }                                                   from './procedure.entity';
export { ProcedureVersionEntity }                                            from './procedure-version.entity';
export { ReviewRequestEntity }                                               from './review-request.entity';
export { PublicationEntity }                                                 from './publication.entity';
export { AcknowledgementEntity }                                             from './acknowledgement.entity';
export { EConsentEntity }                                                    from './econsent.entity';
export { AuditEntity }                                                       from './audit.entity';

/**
 * Export all interfaces and types
 */
export type { ProcedureSection, LegalReference, RiskControl, ProcedureStep } from './procedure-version.entity';
export type { LegalEvidence, DistributionTarget }                            from './publication.entity';
export type { QuizResult, DeviceInfo }                                       from './acknowledgement.entity';
export type { DigitalCertificate, BiometricData, SignatureMetadata }         from './econsent.entity';
export type { AuditContext, DataChange, ComplianceInfo }                     from './audit.entity';
