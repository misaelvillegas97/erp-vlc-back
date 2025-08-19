import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger }    from '@nestjs/common';
import { GpsService }            from '@modules/gps/services/gps.service';
import { Job }                   from 'bullmq';
import { GenericGPS }            from '@modules/gps/domain/interfaces/generic-gps.interface';

@Processor('gps')
@Injectable()
export class GpsProcessor extends WorkerHost {
  private readonly logger = new Logger(GpsProcessor.name);

  constructor(private readonly gpsService: GpsService) {
    super();
  }

  async process(job: Job<GenericGPS>) {
    this.logger.debug(`Processing job ${ job.id }`);

    if (job.name === 'gps.updated') return await this.gpsService.saveGps(job.data);
  }
}
