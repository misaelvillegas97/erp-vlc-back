import { BiogpsRawGroup } from '../domain/interfaces/biogps-raw.interface';
import { GenericGPS }     from '@modules/logistics/domain/interfaces/generic-gps.interface';

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
      };
    });
  }
}
