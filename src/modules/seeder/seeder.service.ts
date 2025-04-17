import { Injectable }               from '@nestjs/common';
import { ConfigService }            from '@nestjs/config';
import { AllConfigType }            from '@core/config/config.type';
import { RoleSeedService }          from '@core/database/seeds/relational/role/role-seed.service';
import { StatusSeedService }        from '@core/database/seeds/relational/status/status-seed.service';
import { UserSeedService }          from '@core/database/seeds/relational/user/user-seed.service';
import { ClientSeedService }        from '@core/database/seeds/relational/client/client-seed.service';
import { FeatureToggleSeedService } from '@core/database/seeds/relational/feature-toggle/feature-toggle-seed.service';

@Injectable()
export class SeederService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly roleSeedService: RoleSeedService,
    private readonly statusSeedService: StatusSeedService,
    private readonly userSeedService: UserSeedService,
    private readonly clientSeedService: ClientSeedService,
    private readonly featureToggleSeedService: FeatureToggleSeedService
  ) {}

  appInfo() {
    return {name: this.configService.get('app.name', {infer: true})};
  }

  /**
   * Seed all application data
   */
  async seedAll(): Promise<void> {
    await this.roleSeedService.run();
    await this.statusSeedService.run();
    await this.userSeedService.run();
    await this.clientSeedService.run();
    await this.featureToggleSeedService.seed();
  }

  /**
   * Seed only feature toggles
   */
  async seedFeatureToggles(): Promise<void> {
    await this.featureToggleSeedService.seed();
  }
}
