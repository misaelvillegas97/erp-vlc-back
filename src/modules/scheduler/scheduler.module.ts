import { Module }                      from '@nestjs/common';
import { BullModule }                  from '@nestjs/bullmq';
import { JobRegistryService }          from './services/job-registry.service';
import { ConfigChangeListenerService } from './services/config-change-listener.service';
import { ScheduledJobsController }     from './controllers/scheduled-jobs.controller';
import { TenantModule }                from '../tenant/tenant.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Module for managing tenant-aware scheduled jobs using BullMQ.
 * Provides services for job registry and reactive configuration updates.
 */
@Module({
  imports: [
    // Import BullMQ queue for GPS jobs
    BullModule.registerQueueAsync({
      name: 'gps-queue',
      imports: [ ConfigModule ],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('workers.host', {infer: true});
        const port = configService.get('workers.port', {infer: true});
        const username = configService.get<string>('workers.user', {infer: true});
        const password = configService.get<string>('workers.password', {infer: true});
        const isProduction = configService.get('app.nodeEnv', {infer: true}) === 'production';

        console.log(`Using BullMQ with host: ${ host }, port: ${ port }, username: ${ username }`);

        return {
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
          connection: {host, port, username, password, family: isProduction ? 0 : undefined}
        };
      },
      inject: [ ConfigService ],
    }),
    // Import TenantModule for configuration services
    TenantModule,
  ],
  controllers: [
    ScheduledJobsController,
  ],
  providers: [
    JobRegistryService,
    ConfigChangeListenerService,
  ],
  exports: [
    JobRegistryService,
    ConfigChangeListenerService,
    BullModule,
  ],
})
export class SchedulerModule {}
