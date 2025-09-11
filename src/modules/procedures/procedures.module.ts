import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule }         from '@nestjs/bullmq';

// Import all entities
import {
  AcknowledgementEntity,
  AuditEntity,
  EConsentEntity,
  ProcedureEntity,
  ProcedureVersionEntity,
  PublicationEntity,
  ReviewRequestEntity
} from './domain/entities';

// Import services
import { ProceduresService }            from './services/procedures.service';
import { ReviewService }                from './services/review.service';
import { PublicationSchedulerService }  from './services/publication-scheduler.service';
import { PublicationService }           from './services/publication.service';
import { AcknowledgementService }       from './services/acknowledgement.service';
import { HealthService }                from './services/health.service';
import { PublicationQueueProcessor }    from './services/publication-queue.processor';
import { ProcedureEventHandlerService } from './services/procedure-event-handler.service';

// Import controllers
import { ProceduresController } from './controllers/procedures.controller';

/**
 * Procedures Module for Chilean Legal Compliance
 *
 * This module implements a comprehensive procedure management system
 * that complies with Chilean labor law requirements including:
 * - Procedure creation and versioning
 * - Review and approval workflows
 * - Legal publication with 30-day notice periods
 * - Worker acknowledgments with electronic signatures
 * - Complete audit trails for compliance
 *
 * Features:
 * - Multi-tenant architecture with tenant isolation
 * - Event-driven architecture for async processing
 * - Comprehensive audit logging
 * - Chilean legal compliance (Código del Trabajo, DS 594/1999, etc.)
 */
@Module({
  imports: [
    // Register TypeORM entities for dependency injection
    TypeOrmModule.forFeature([
      ProcedureEntity,
      ProcedureVersionEntity,
      ReviewRequestEntity,
      PublicationEntity,
      AcknowledgementEntity,
      EConsentEntity,
      AuditEntity
    ]),

    // EventEmitter for async communication between modules
    EventEmitterModule.forRoot({
      // Use this instance across child modules
      global: false,
      // Set the delimiter used to segment namespaces
      delimiter: '.',
      // Set this to `true` to use wildcards
      wildcard: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // Show event name in memory leak message when more than maximum listeners assigned
      verboseMemoryLeak: true,
      // Disable throwing uncaught exception if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),

    // BullMQ for job scheduling and background processing
    BullModule.registerQueue({
      name: 'publication-scheduler',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })
  ],

  controllers: [
    ProceduresController
  ],

  providers: [
    ProceduresService,
    ReviewService,
    PublicationSchedulerService,
    PublicationService,
    AcknowledgementService,
    HealthService,
    PublicationQueueProcessor,
    ProcedureEventHandlerService,

    // TODO: Add additional services as they are implemented:
    // EConsentService,
    // AuditService
  ],

  exports: [
    // Export services for use in other modules
    ProceduresService,
    ReviewService,
    PublicationSchedulerService,
    PublicationService,
    AcknowledgementService,
    HealthService,

    // Export TypeORM repositories for other modules that might need direct access
    TypeOrmModule,
  ]
})
export class ProceduresModule {}

/**
 * Event types emitted by this module for async communication:
 *
 * PROCEDURE LIFECYCLE:
 * - procedure.created - When a new procedure is created
 * - procedure.version.created - When a new version is created
 *
 * REVIEW WORKFLOW:
 * - procedure.review.requested - When a review is requested
 * - procedure.review.completed - When a review is completed
 *
 * PUBLICATION EVENTS:
 * - procedure.publication.scheduled - When publication is scheduled
 * - procedure.publication.cancelled - When scheduled publication is cancelled
 * - procedure.publication.executed - When publication is executed
 *
 * LEGAL COMPLIANCE:
 * - procedure.pre-notice.sent - 30-day advance notice sent (Chilean law)
 * - procedure.union-notifications.sent - Union notifications delivered
 * - procedure.daily-reminder.send - Daily reminders to workers
 * - procedure.compliance.checked - Compliance verification performed
 *
 * DISTRIBUTION:
 * - procedure.distribution.requested - Multi-channel distribution requested
 * - procedure.pdf.generated - PDF version generated
 *
 * WORKER INTERACTIONS:
 * - procedure.acknowledgment.created - Worker acknowledges procedure
 * - procedure.quiz.completed - Worker completes mandatory quiz
 * - procedure.econsent.created - Electronic consent registered
 *
 * DOCUMENTATION:
 * - procedure.legal-evidence.added - Legal evidence uploaded
 *
 * All events are handled by ProcedureEventHandlerService which coordinates
 * notifications, compliance tracking, audit logging, and external integrations.
 * See EVENT-HANDLING.md for detailed documentation.
 */
