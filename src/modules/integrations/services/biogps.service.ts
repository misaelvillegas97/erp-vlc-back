import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import axios                  from 'axios';
import { BiogpsRawGroup }     from '../domain/interfaces/biogps-raw.interface';
import { BiogpsParser }       from '../utils/biogps-parser';
import { GenericGPS }         from '@modules/logistics/domain/interfaces/generic-gps.interface';

@Injectable()
export class BiogpsService {
  private readonly logger = new Logger(BiogpsService.name);
  private readonly apiUrl: string;
  private readonly apiHash: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('BiogpsService initialized');
    this.apiUrl = this.configService.get<string>('gps.biogps.apiUrl', {infer: true});
    this.apiHash = this.configService.get<string>('gps.biogps.apiHash', {infer: true});
  }

  /**
   * Fetch GPS data from Biogps API and process it
   */
  async run(): Promise<GenericGPS[]> {
    if (!this.apiUrl || !this.apiHash) {
      this.logger.warn('Biogps API URL or Hash is not configured');
      return [];
    }

    try {
      this.logger.log('Fetching GPS data from BioGPS API');
      const startTime = Date.now();
      const response = await axios.get<BiogpsRawGroup[]>(`${ this.apiUrl }?user_api_hash=${ this.apiHash }`);
      const endTime = Date.now();
      this.logger.log(`Fetched GPS data in ${ (endTime - startTime) }ms`);

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Biogps API');
        return [];
      }

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.toGeneric(response.data);

      // Emit events for each GPS
      this.emitGpsEvents(gpsData);

      this.logger.log(`Fetched and parsed ${ gpsData.length } GPS records`);
      return gpsData;
    } catch (error) {
      this.logger.error(`Error fetching GPS data: ${ error.message }`, error.stack);
      return [];
    }
  }

  /**
   * Emit events for each GPS
   */
  private emitGpsEvents(gpsData: GenericGPS[]): void {
    gpsData.forEach(gps => {
      this.logger.debug(`Emitting GPS event for vehicle: ${ gps.licensePlate }`);
      this.eventEmitter.emit('gps.updated', gps);
    });
  }
}
