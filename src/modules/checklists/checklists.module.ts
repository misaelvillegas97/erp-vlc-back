import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ChecklistTemplateEntity }  from './domain/entities/checklist-template.entity';
import { ChecklistGroupEntity }     from './domain/entities/checklist-group.entity';
import { CategoryEntity }           from './domain/entities/category.entity';
import { QuestionEntity }           from './domain/entities/question.entity';
import { ChecklistExecutionEntity } from './domain/entities/checklist-execution.entity';
import { ChecklistAnswerEntity }    from './domain/entities/checklist-answer.entity';
import { IncidentEntity }           from './domain/entities/incident.entity';

// Services
import { ChecklistTemplateService }  from './services/checklist-template.service';
import { ChecklistExecutionService } from './services/checklist-execution.service';
import { ChecklistGroupService }     from './services/checklist-group.service';
import { ChecklistExportService }    from './services/checklist-export.service';

// Controllers
import { ChecklistTemplateController }  from './controllers/checklist-template.controller';
import { ChecklistExecutionController } from './controllers/checklist-execution.controller';
import { ChecklistGroupController }     from './controllers/checklist-group.controller';
import { IncidentController }           from './controllers/incident.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChecklistTemplateEntity,
      ChecklistGroupEntity,
      CategoryEntity,
      QuestionEntity,
      ChecklistExecutionEntity,
      ChecklistAnswerEntity,
      IncidentEntity,
    ]),
  ],
  controllers: [
    ChecklistTemplateController,
    ChecklistExecutionController,
    ChecklistGroupController,
    IncidentController,
  ],
  providers: [
    ChecklistTemplateService,
    ChecklistExecutionService,
    ChecklistGroupService,
    ChecklistExportService,
  ],
  exports: [
    ChecklistTemplateService,
    ChecklistExecutionService,
    ChecklistGroupService,
  ],
})
export class ChecklistsModule {}
