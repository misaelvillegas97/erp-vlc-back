import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { FlowTemplateEntity }    from './domain/entities/flow-template.entity';
import { FlowVersionEntity }     from './domain/entities/flow-version.entity';
import { FlowStepEntity }        from './domain/entities/flow-step.entity';
import { FieldCategoryEntity }   from './domain/entities/field-category.entity';
import { FieldDefEntity }        from './domain/entities/field-def.entity';
import { TerminationRuleEntity } from './domain/entities/termination-rule.entity';
import { FlowInstanceEntity }    from './domain/entities/flow-instance.entity';
import { StepExecutionEntity }   from './domain/entities/step-execution.entity';
import { FieldValueEntity }      from './domain/entities/field-value.entity';
import { WasteRecordEntity }     from './domain/entities/waste-record.entity';
import { OrderLinkEntity }       from './domain/entities/order-link.entity';
import { SyncOutboxEntity }      from './domain/entities/sync-outbox.entity';
import { AuditLogEntity }        from './domain/entities/audit-log.entity';

// Services
import { FlowTemplateService }    from './services/flow-template.service';
import { FlowVersionService }     from './services/flow-version.service';
import { FlowStepService }        from './services/flow-step.service';
import { FieldService }           from './services/field.service';
import { TerminationRuleService } from './services/termination-rule.service';
import { FlowExecutionService }   from './services/flow-execution.service';
import { StepExecutionService }   from './services/step-execution.service';
import { SyncService }            from './services/sync.service';
import { WasteManagementService } from './services/waste-management.service';
import { KpiService }             from './services/kpi.service';
import { GateEvaluationService }  from './services/gate-evaluation.service';

// Controllers
import { FlowTemplateController }    from './controllers/flow-template.controller';
import { FlowVersionController }     from './controllers/flow-version.controller';
import { FlowStepController }        from './controllers/flow-step.controller';
import { FieldController }           from './controllers/field.controller';
import { TerminationRuleController } from './controllers/termination-rule.controller';
import { FlowExecutionController }   from './controllers/flow-execution.controller';
import { StepExecutionController }   from './controllers/step-execution.controller';
import { SyncController }            from './controllers/sync.controller';
import { ReportsController }         from './controllers/reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlowTemplateEntity,
      FlowVersionEntity,
      FlowStepEntity,
      FieldCategoryEntity,
      FieldDefEntity,
      TerminationRuleEntity,
      FlowInstanceEntity,
      StepExecutionEntity,
      FieldValueEntity,
      WasteRecordEntity,
      OrderLinkEntity,
      SyncOutboxEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [
    FlowTemplateController,
    FlowVersionController,
    FlowStepController,
    FieldController,
    TerminationRuleController,
    FlowExecutionController,
    StepExecutionController,
    SyncController,
    ReportsController,
  ],
  providers: [
    FlowTemplateService,
    FlowVersionService,
    FlowStepService,
    FieldService,
    TerminationRuleService,
    FlowExecutionService,
    StepExecutionService,
    SyncService,
    WasteManagementService,
    KpiService,
    GateEvaluationService,
  ],
  exports: [
    FlowTemplateService,
    FlowVersionService,
    FlowStepService,
    FieldService,
    TerminationRuleService,
    FlowExecutionService,
    StepExecutionService,
    SyncService,
    WasteManagementService,
    KpiService,
    GateEvaluationService,
  ],
})
export class TracingModule {}
