import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { StatusSeedService } from './status-seed.service';
import { StatusEntity }      from '@modules/statuses/domain/entities/status.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ StatusEntity ]) ],
  providers: [ StatusSeedService ],
  exports: [ StatusSeedService ],
})
export class StatusSeedModule {}
