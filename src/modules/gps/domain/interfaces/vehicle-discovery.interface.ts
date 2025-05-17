import { GPSProviderEnum } from '@modules/gps/domain/enums/provider.enum';

export interface VehicleDiscovery {
  vehicles: Array<{
    providerId: string;
    licensePlate: string;
  }>,
  provider: GPSProviderEnum;
}
