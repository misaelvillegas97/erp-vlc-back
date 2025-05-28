import { Controller, Get } from '@nestjs/common';
import { ApiTags }         from '@nestjs/swagger';

import { SeederService } from './seeder.service';

@ApiTags('Home')
@Controller()
export class SeederController {
  constructor(
    private service: SeederService
  ) {}

  @Get()
  appInfo() {
    return this.service.appInfo();
  }

  @Get('seed')
  async seed() {
    await this.service.seedAll();

    return {message: 'Database seeding completed successfully!'};
  }
}
