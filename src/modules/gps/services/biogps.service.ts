import { Injectable, Logger }               from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { EventEmitter2 }                    from '@nestjs/event-emitter';
import axios                                from 'axios';
import { BiogpsRawGroup, BiogpsRawHistory } from '../domain/interfaces/biogps-raw.interface';
import { BiogpsParser }                     from '../utils/biogps-parser';
import { GenericGPS }                       from '@modules/gps/domain/interfaces/generic-gps.interface';
import { AppConfigService }                 from '@modules/config/app-config.service';
import { GPSProviderEnum }                  from '@modules/gps/domain/enums/provider.enum';
import { IGpsProvider }                     from '../domain/interfaces/gps-provider.interface';
import { VehicleDiscovery }                 from '@modules/gps/domain/interfaces/vehicle-discovery.interface';

@Injectable()
export class BiogpsService implements IGpsProvider {
  private readonly logger = new Logger(BiogpsService.name);

  constructor(
    private readonly cs: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: AppConfigService,
  ) {
    this.logger.log('BiogpsService initialized');
  }

  /**
   * Fetch GPS data from Biogps API and process it
   */
  async getAllCurrent(apiUrl: string, apiHash: string): Promise<GenericGPS[]> {
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

      this.logger.debug(`Fetched and parsed ${ gpsData.length } GPS records`);
      return gpsData;
    } catch (error) {
      this.logger.error(`Error fetching GPS data: ${ error.message }`, error.stack);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getOneCurrent(apiUrl: string, apiHash: string): Promise<GenericGPS> {
    return undefined;
  }

  /**
   * Fetch GPS history from Biogps API and process it
   */
  async getOneHistory(apiUrl: string, apiHash: string, licensePlate: string, vehicleId?: string, startTime?: Date, endTime?: Date): Promise<GenericGPS[]> {
    if (!apiUrl || !apiHash) {
      this.logger.warn('Biogps API URL or Hash is not configured');
      return [];
    }

    try {
      console.log(); // Just to separate logs
      this.logger.debug('Fetching GPS history from BioGPS API');
      const fetchStartTime = Date.now();

      // Build the URL with parameters
      let url = `${ apiUrl }?lang=es&snap_to_road=true&user_api_hash=${ apiHash }`;

      // Add device ID (vehicle ID) if provided
      if (vehicleId) {
        url += `&device_id=${ vehicleId }`;
      }

      // Add time range if provided
      if (startTime && endTime) {
        // Format dates as YYYY-MM-DD in America/Santiago timezone
        const fromDateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const toDateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        // Get formatted date parts
        const fromDateParts = fromDateFormatter.formatToParts(startTime);
        const toDateParts = toDateFormatter.formatToParts(endTime);

        // Construct YYYY-MM-DD format
        const fromDate = `${ fromDateParts.find(part => part.type === 'year').value }-${ fromDateParts.find(part => part.type === 'month').value }-${ fromDateParts.find(part => part.type === 'day').value }`;
        const toDate = `${ toDateParts.find(part => part.type === 'year').value }-${ toDateParts.find(part => part.type === 'month').value }-${ toDateParts.find(part => part.type === 'day').value }`;

        // Format times as HH:MM in America/Santiago timezone
        const fromTimeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const toTimeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        // Get formatted time parts
        const fromTimeParts = fromTimeFormatter.formatToParts(startTime);
        const toTimeParts = toTimeFormatter.formatToParts(endTime);

        // Construct HH:MM format
        const fromTime = `${ fromTimeParts.find(part => part.type === 'hour').value }:${ fromTimeParts.find(part => part.type === 'minute').value }`;
        const toTime = `${ toTimeParts.find(part => part.type === 'hour').value }:${ toTimeParts.find(part => part.type === 'minute').value }`;

        url += `&from_date=${ fromDate }&from_time=${ fromTime }&to_date=${ toDate }&to_time=${ toTime }&snap_to_road=true`;
      }

      this.logger.debug(`Fetching GPS history from BioGPS API: ${ url }`);
      const response = await axios.get<BiogpsRawHistory>(url);
      const fetchEndTime = Date.now();
      this.logger.debug(`Fetched GPS history in ${ (fetchEndTime - fetchStartTime) }ms`);

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.fromHistoryToGeneric(response.data, licensePlate);

      this.logger.debug(`Fetched and parsed ${ gpsData.length } GPS records`);
      return gpsData;
    } catch (error) {
      this.logger.error(`Error fetching GPS data: ${ error.message }`, error.stack);
      return [];
    }
  }

  async discover(apiUrl: string, apiHash: string): Promise<VehicleDiscovery> {

    try {
      const response = await axios.get<BiogpsRawGroup[]>(`${ apiUrl }?user_api_hash=${ apiHash }`);

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Biogps API');
        return;
      }

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.toGeneric(response.data);

      const vehiclesLicensePlates = gpsData.map(gps => ({
        providerId: gps.vehicleId,
        licensePlate: gps.licensePlate
      }));

      this.emitVehicleDiscovery({
        vehicles: vehiclesLicensePlates,
        provider: GPSProviderEnum.BIOGPS,
      });
    } catch (error) {
      this.logger.error(`Error fetching GPS vehicle discovery: ${ error.message }`, error.stack);
    }
  }

  /**
   * Emit events for each GPS
   */
  emitGpsEvents(gpsData: GenericGPS[]): void {
    gpsData.forEach(gps => this.eventEmitter.emit('gps.updated', gps));
  }

  emitVehicleDiscovery(vehicleDiscovery: VehicleDiscovery): void {
    this.eventEmitter.emit('vehicle.gps.provider.added', vehicleDiscovery);
  }

  private async getBiogpsConfig() {
    const config = await this.configService.findFeatureToggleByName('biogps-provider');
    if (!config?.enabled) {
      this.logger.warn('Biogps provider is not enabled');
      return null;
    }

    return {
      apiUrl: config.metadata.endpoint,
      apiHash: config.metadata.apiKey
    };
  }

  private async getBiogpsHistoryConfig() {
    const config = await this.configService.findFeatureToggleByName('biogps-history');
    if (!config?.enabled) {
      this.logger.warn('Biogps history provider is not enabled');
      return null;
    }

    return {
      apiUrl: config.metadata.endpoint,
      apiHash: config.metadata.apiKey,
    };
  }
}
