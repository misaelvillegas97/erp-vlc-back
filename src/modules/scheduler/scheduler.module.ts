import { Module }                      from '@nestjs/common';
import { BullModule }                  from '@nestjs/bullmq';
import { JobRegistryService }          from './services/job-registry.service';
import { ConfigChangeListenerService } from './services/config-change-listener.service';
import { ScheduledJobsController }     from './controllers/scheduled-jobs.controller';
import { TenantModule }                from '../tenant/tenant.module';

/**
 * Module for managing tenant-aware scheduled jobs using BullMQ.
 * Provides services for job registry and reactive configuration updates.
 */
@Module({
  imports: [
    // Import BullMQ queue for GPS jobs
    BullModule.registerQueueAsync({
      useFactory: () => {
        const redisHost = process.env.WORKER_HOST || 'localhost';
        const redisPort = Number(process.env.WORKER_PORT) || 6379;

        console.log(`Initializing GPS queue with Redis at ${ redisHost }:${ redisPort }`);

        return {
          name: 'gps-queue',
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
            host: redisHost,
            port: redisPort,
          }
        };
      }
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
