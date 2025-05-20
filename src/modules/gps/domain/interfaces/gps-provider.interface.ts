import { GenericGPS }       from '@modules/gps/domain/interfaces/generic-gps.interface';
import { VehicleDiscovery } from '@modules/gps/domain/interfaces/vehicle-discovery.interface';

export interface IGpsProvider {
  getAllCurrent(apiUrl: string, apiHash: string): Promise<GenericGPS[]>;

  getOneCurrent(apiUrl: string, apiHash: string, vehicleId?: string): Promise<GenericGPS>;

  getOneHistory(apiUrl: string, apiHash: string, providerId?: string, startTime?: Date, endTime?: Date): Promise<GenericGPS[]>;

  discover(apiUrl: string, apiHash: string): Promise<VehicleDiscovery>;

  emitGpsEvents(gpsData: GenericGPS[]): void;
}
