import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { ClientEntity }      from '@modules/clients/domain/entities/client.entity';
import { ClientSeedService } from '@core/database/seeds/relational/client/client-seed.service';

@Module({
  imports: [ TypeOrmModule.forFeature([ ClientEntity ]) ],
  providers: [ ClientSeedService ],
  exports: [ ClientSeedService ],
})
export class ClientSeedModule {}
