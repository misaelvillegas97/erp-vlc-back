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

    return {message: 'CencosudB2B tasks scheduled'};
  }

  @Get('wallmart')
  wallmart() {
    void this.tasksScheduler.checkComercioNet();

    return {message: 'WallmartB2B tasks scheduled'};
  }
}
