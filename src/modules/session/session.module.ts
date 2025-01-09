import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionEntity }     from '@modules/session/domain/entities/session.entity';
import { SessionRepository } from '@modules/session/domain/repositories/session.repository';
import { SessionService }    from './session.service';

@Module({
  imports: [ TypeOrmModule.forFeature([ SessionEntity ]) ],
  providers: [ SessionService, SessionRepository ],
  exports: [ SessionService, SessionRepository ],
})
export class SessionModule {}
