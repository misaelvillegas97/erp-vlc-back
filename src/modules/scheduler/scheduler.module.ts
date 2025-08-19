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
      useFactory: (configService: ConfigService) => ({
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
        connection: {
          host: configService.get<string>('workers.host', {infer: true}),
          port: configService.get<number>('workers.port', {infer: true}),
        }
      }),
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
