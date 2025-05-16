import { Injectable, Logger }               from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { EventEmitter2 }                    from '@nestjs/event-emitter';
import axios                                from 'axios';
import { BiogpsRawGroup, BiogpsRawHistory } from '../domain/interfaces/biogps-raw.interface';
import { BiogpsParser }                     from '../utils/biogps-parser';
import { GenericGPS }                       from '@modules/logistics/domain/interfaces/generic-gps.interface';
import { AppConfigService }                 from '@modules/config/app-config.service';

@Injectable()
export class BiogpsService {
  private readonly logger = new Logger(BiogpsService.name);
  private readonly apiUrl: string;
  private readonly apiHash: string;

  constructor(
    private readonly cs: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: AppConfigService,
  ) {
    this.logger.log('BiogpsService initialized');
    this.apiUrl = this.cs.get<string>('gps.biogps.apiUrl', {infer: true});
    this.apiHash = this.cs.get<string>('gps.biogps.apiHash', {infer: true});
  }

  /**
   * Fetch GPS data from Biogps API and process it
   */
  async run(apiUrl: string = this.apiUrl, apiHash: string = this.apiHash): Promise<GenericGPS[]> {
    if (!apiUrl || !apiHash) {
      this.logger.warn('Biogps API URL or Hash is not configured');
      return [];
    }

    try {
      console.log(); // Just to separate logs
      this.logger.debug('Fetching GPS data from BioGPS API');
      const startTime = Date.now();
      const response = await axios.get<BiogpsRawGroup[]>(`${ apiUrl }?user_api_hash=${ apiHash }`);
      const endTime = Date.now();
      this.logger.debug(`Fetched GPS data in ${ (endTime - startTime) }ms`);

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Biogps API');
        return [];
      }

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.toGeneric(response.data);

      // Emit events for each GPS
      this.emitGpsEvents(gpsData);

      this.logger.debug(`Fetched and parsed ${ gpsData.length } GPS records`);
      return gpsData;
    } catch (error) {
      this.logger.error(`Error fetching GPS data: ${ error.message }`, error.stack);
      return [];
    }
  }

  /**
   * Fetch GPS history from Biogps API and process it
   */
  async runHistory(apiUrl: string = this.apiUrl, apiHash: string = this.apiHash): Promise<GenericGPS[]> {
    if (!apiUrl || !apiHash) {
      this.logger.warn('Biogps API URL or Hash is not configured');
      return [];
    }

    try {
      console.log(); // Just to separate logs
      this.logger.debug('Fetching GPS history from BioGPS API');
      const startTime = Date.now();
      const response = await axios.get<BiogpsRawHistory[]>(`${ apiUrl }?user_api_hash=${ apiHash }&history=1`);
      const endTime = Date.now();
      this.logger.debug(`Fetched GPS history in ${ (endTime - startTime) }ms`);

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Biogps API');
        return [];
      }

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.fromHistoryToGeneric(response.data);

      // Emit events for each GPS
      this.emitGpsEvents(gpsData);

      this.logger.debug(`Fetched and parsed ${ gpsData.length } GPS records`);
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
    gpsData.forEach(gps => this.eventEmitter.emit('gps.updated', gps));
  }
}
