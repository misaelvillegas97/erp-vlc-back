import { Module }                      from '@nestjs/common';
import { BullModule }                  from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GpsSyncProcessor }            from './processors/gps-sync.processor';
import { TenantModule }                from '../tenant/tenant.module';
import { GpsModule }                   from '../gps/gps.module';

/**
 * Module for managing tenant-aware workers and job processors.
 * Handles background job processing with proper tenant context isolation.
 */
@Module({
  imports: [
    // Import BullMQ for job processing
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
    // Import tenant services for context management
    TenantModule,
    // Import GPS services for provider factory
    GpsModule,
  ],
  providers: [
    GpsSyncProcessor,
  ],
  exports: [
    BullModule,
    GpsSyncProcessor,
  ],
})
export class WorkersModule {}
