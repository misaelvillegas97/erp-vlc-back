import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SeederService } from './seeder.service';

@ApiTags('Seeder')
@Controller()
export class SeederController {
  constructor(
    private service: SeederService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({ status: 200, description: 'Application information retrieved successfully.' })
  appInfo() {
    return this.service.appInfo();
  }

  @Get('seed')
  @ApiOperation({ summary: 'Seed all data' })
  @ApiResponse({ status: 200, description: 'Database seeding completed successfully.' })
  async seed() {
    await this.service.seedAll();

    return {message: 'Database seeding completed successfully!'};
  }

  @Get('seed/feature-toggles')
  @ApiOperation({ summary: 'Seed feature toggles' })
  @ApiResponse({ status: 200, description: 'Feature toggles seeding completed successfully.' })
  async seedFeatureToggles() {
    await this.service.seedFeatureToggles();

    return {message: 'Feature toggles seeding completed successfully!'};
  }
}
