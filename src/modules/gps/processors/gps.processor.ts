import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger }    from '@nestjs/common';
import { GpsService }            from '@modules/gps/services/gps.service';
import { Job }                   from 'bullmq';
import { GenericGPS }            from '@modules/gps/domain/interfaces/generic-gps.interface';
import { VehicleSessionEntity }  from '@modules/logistics/fleet-management/domain/entities/vehicle-session.entity';
import { VehicleEntity }         from '@modules/logistics/fleet-management/domain/entities/vehicle.entity';

@Processor('gps')
@Injectable()
export class GpsProcessor extends WorkerHost {
  private readonly logger = new Logger(GpsProcessor.name);

  constructor(private readonly gpsService: GpsService) {
    super();
  }

  async process(job: Job<{ gps: GenericGPS, vehicle: VehicleEntity, session: VehicleSessionEntity }>) {
    this.logger.debug(`Processing job ${ job.id }, name: ${ job.name }`);

    const {gps, vehicle, session} = job.data;

    if (job.name === 'gps.updated') return await this.gpsService.saveGps(gps, vehicle, session);
  }
}
