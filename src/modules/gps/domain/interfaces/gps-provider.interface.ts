import { GenericGPS }       from '@modules/gps/domain/interfaces/generic-gps.interface';
import { VehicleDiscovery } from '@modules/gps/domain/interfaces/vehicle-discovery.interface';

export interface IGpsProvider {
  getCurrent(apiUrl: string, apiHash: string): Promise<GenericGPS[]>;

  getHistory(apiUrl: string, apiHash: string, vehicleId?: string, startTime?: Date, endTime?: Date): Promise<GenericGPS[]>;

  discover(apiUrl: string, apiHash: string): Promise<VehicleDiscovery>;

  emitGpsEvents(gpsData: GenericGPS[]): void;
}
