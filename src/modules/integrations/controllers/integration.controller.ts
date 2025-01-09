import { Controller, Get } from '@nestjs/common';
import { TasksScheduler }  from '@modules/integrations/scheduler/tasks.scheduler';

@Controller('integrations/run')
export class IntegrationController {
  constructor(
    private readonly tasksScheduler: TasksScheduler,
  ) {}

  @Get('cencosud')
  cencosud() {
    return this.tasksScheduler.checkCencoB2B();
  }
}
