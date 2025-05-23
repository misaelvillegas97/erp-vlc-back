import { Module }           from '@nestjs/common';
import { TerminusModule }   from '@nestjs/terminus';
import { HttpModule }       from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule.forRoot(),
    HttpModule,
  ],
  controllers: [ HealthController ],
  providers: [],
})
export class HealthModule {}
