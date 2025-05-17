import { Injectable, Logger }               from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import { EventEmitter2 }                    from '@nestjs/event-emitter';
import axios                                from 'axios';
import { BiogpsRawGroup, BiogpsRawHistory } from '../domain/interfaces/biogps-raw.interface';
import { BiogpsParser }                     from '../utils/biogps-parser';
import { GenericGPS }                       from '@modules/logistics/domain/interfaces/generic-gps.interface';
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
  async getCurrent(apiUrl: string, apiHash: string): Promise<GenericGPS[]> {
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

  /**
   * Fetch GPS history from Biogps API and process it
   */
  async getHistory(apiUrl: string, apiHash: string, vehicleId?: string, startTime?: Date, endTime?: Date): Promise<GenericGPS[]> {
    if (!apiUrl || !apiHash) {
      this.logger.warn('Biogps API URL or Hash is not configured');
      return [];
    }

    try {
      console.log(); // Just to separate logs
      this.logger.debug('Fetching GPS history from BioGPS API');
      const fetchStartTime = Date.now();

      // Build the URL with parameters
      let url = `${ apiUrl }?user_api_hash=${ apiHash }&history=1`;

      // Add vehicle ID if provided
      if (vehicleId) {
        url += `&vehicle_id=${ vehicleId }`;
      }

      // Add time range if provided
      if (startTime && endTime) {
        const startTimeStr = Math.floor(startTime.getTime() / 1000);
        const endTimeStr = Math.floor(endTime.getTime() / 1000);
        url += `&from=${ startTimeStr }&to=${ endTimeStr }`;
      }

      const response = await axios.get<BiogpsRawHistory[]>(url);
      const fetchEndTime = Date.now();
      this.logger.debug(`Fetched GPS history in ${ (fetchEndTime - fetchStartTime) }ms`);

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Biogps API');
        return [];
      }

      // Parse the raw data to GenericGPS format
      const gpsData = BiogpsParser.fromHistoryToGeneric(response.data);

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
      apiHash: config.metadata.apiKey,
      apiHistoryUrl: config.metadata.historyEndpoint,
    };
  }
}
