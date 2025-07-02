import { BiogpsRawGroup, BiogpsRawHistory } from '../domain/interfaces/biogps-raw.interface';
import { GenericGPS }                       from '@modules/gps/domain/interfaces/generic-gps.interface';
import { DateTime }                         from 'luxon';
import { GPSProviderEnum }                  from '@modules/gps/domain/enums/provider.enum';

export class BiogpsParser {
  /**
   * Convert the raw BIOGPS response into an array of GenericGPS
   */
  static toGeneric(raw: BiogpsRawGroup[]): GenericGPS[] {
    const allItems = raw.flatMap(group => group.items);

    return allItems.map(item => {
      let licensePlate = item.device_data?.plate_number?.trim() || '';

      if (!licensePlate) {
        const nameStr = item.name.trim();
        const matches = nameStr.match(/\b([A-Z0-9]+-[A-Z0-9]+)\b/i);
        if (matches && matches[1]) {
          licensePlate = matches[1];
        } else {
          const words = nameStr.split(/\s+/);
          licensePlate = words[words.length - 1];
        }
      }

      licensePlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');

      const lastLocations = item.tail.map(({lat, lng}) => ({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      }));

      return {
        vehicleId: item.id.toString(),
        licensePlate,
        status: item.online,
        currentLocation: {
          lat: item.lat,
          lng: item.lng,
          timestamp: item.timestamp,
        },
        lastLocations,
        speed: item.speed,
        totalDistance: item.total_distance,
        referenceId: item.device_data?.traccar?.latestPosition_id.toString(),
        provider: GPSProviderEnum.BIOGPS,
      };
    });
  }

  static fromHistoryToGeneric(raw: BiogpsRawHistory, licensePlate: string): GenericGPS[] {
    console.log('Parsing BIOGPS history data...', raw);
    const innerItems = raw.items.flatMap(item => item.items);

    return innerItems.map(item => {
      const timestamp = DateTime.fromFormat(item.raw_time, 'yyyy-MM-dd HH:mm:ss', {zone: 'America/Santiago'}).toUTC().toMillis();

      return {
        licensePlate,
        status: item.valid ? 'online' : 'offline',
        currentLocation: {
          lat: item.latitude,
          lng: item.longitude,
          timestamp,
        },
        lastLocations: [],
        speed: item.speed,
        totalDistance: item.distance,
        referenceId: item.id.toString(),
        provider: GPSProviderEnum.BIOGPS,
      };
    });
  }
}
