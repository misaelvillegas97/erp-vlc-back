import { Controller, Get } from '@nestjs/common';
import { TasksScheduler }  from '@modules/integrations/scheduler/tasks.scheduler';

@Controller('integrations/run')
export class IntegrationController {
  constructor(
    private readonly tasksScheduler: TasksScheduler,
  ) {}

  @Get('cencosud')
  cencosud() {
    void this.tasksScheduler.checkCencoB2B();

    return {message: 'CencoB2B tasks scheduled'};
  }
}
