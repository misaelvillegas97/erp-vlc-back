import { Controller, Get } from '@nestjs/common';
import { ApiTags }         from '@nestjs/swagger';

import { SeederService }     from './seeder.service';
import { UserSeedService }   from '@core/database/seeds/relational/user/user-seed.service';
import { StatusSeedService } from '@core/database/seeds/relational/status/status-seed.service';
import { RoleSeedService }   from '@core/database/seeds/relational/role/role-seed.service';
import { ClientSeedService } from '@core/database/seeds/relational/client/client-seed.service';

@ApiTags('Home')
@Controller()
export class SeederController {
  constructor(
    private readonly roleSeedService: RoleSeedService,
    private readonly statusSeedService: StatusSeedService,
    private readonly userSeedService: UserSeedService,
    private readonly clientSeedService: ClientSeedService,
    private service: SeederService
  ) {}

  @Get()
  appInfo() {
    return this.service.appInfo();
  }

  @Get('seed')
  async seed() {
    await this.roleSeedService.run();
    await this.statusSeedService.run();
    await this.userSeedService.run();
    await this.clientSeedService.run();
  }
}
