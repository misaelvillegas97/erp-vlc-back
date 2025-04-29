import { Module }                           from '@nestjs/common';
import { SeederService }                    from './seeder.service';
import { SeederController }                 from './seeder.controller';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { RoleSeedService }                  from '@core/database/seeds/relational/role/role-seed.service';
import { StatusSeedService }                from '@core/database/seeds/relational/status/status-seed.service';
import { UserSeedService }                  from '@core/database/seeds/relational/user/user-seed.service';
import { UsersModule }                      from '@modules/users/users.module';
import { ClientSeedService }                from '@core/database/seeds/relational/client/client-seed.service';
import { ClientsModule }                    from '@modules/clients/clients.module';
import { ConfigModule }                     from '@modules/config/config.module';
import { FeatureToggleSeedService }         from '@core/database/seeds/relational/feature-toggle/feature-toggle-seed.service';

@Module({
  imports: [
    UsersModule,
    NestConfigModule,
    ClientsModule,
    ConfigModule
  ],
  controllers: [ SeederController ],
  providers: [
    RoleSeedService,
    StatusSeedService,
    UserSeedService,
    SeederService,
    ClientSeedService,
    FeatureToggleSeedService
  ],
})
export class SeederModule {}
