import { GPSProviderEnum }                                                from '@modules/gps/domain/enums/provider.enum';
import { GenericGPS }                                                     from '@modules/gps/domain/interfaces/generic-gps.interface';
import { BiogpsRawGroup, BiogpsRawHistory, BiogpsRawItem }                from '@modules/gps/domain/interfaces/biogps-raw.interface';
import { buildCleanPathFromGeneric, GpsPoint, parseGpsTimeToUnixSeconds } from '@modules/gps/utils/gps.utils';

function asNum(n: unknown): number | null {
  const v = typeof n === 'string' ? Number(n) : (typeof n === 'number' ? n : NaN);
  return Number.isFinite(v) ? v : null;
}

function mapLastLocations(src: any): Array<{ lat: number; lng: number }> {
  // Soporta varias formas: lastLocations, last_locations, positions, breadcrumbs
  const arr: any[] =
    Array.isArray(src?.lastLocations) ? src.lastLocations :
      Array.isArray(src?.last_locations) ? src.last_locations :
        Array.isArray(src?.positions) ? src.positions :
          Array.isArray(src?.breadcrumbs) ? src.breadcrumbs : [];

  const out: Array<{ lat: number; lng: number }> = [];
  for (const it of arr) {
    const lat = asNum(it?.lat ?? it?.latitude);
    const lng = asNum(it?.lng ?? it?.longitude);
    if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      out.push({lat, lng});
    }
  }
  return out;
}

function pickTimestampSeconds(item: any): number {
  // Prioriza epoch del “live”. Si no, parsea raw_time del historial.
  const liveRaw =
    item?.timestamp ?? item?.time ?? item?.gps_time ?? item?.server_time;

  const liveTs = typeof liveRaw === 'number'
    ? (liveRaw > 1e12 ? Math.floor(liveRaw / 1000) : Math.floor(liveRaw))
    : parseGpsTimeToUnixSeconds(liveRaw);

  if (liveTs && Number.isFinite(liveTs)) return liveTs;

  const histTs = parseGpsTimeToUnixSeconds(item?.raw_time);
  return histTs ?? 0;
}

function isValidCoord(lat: unknown, lng: unknown): lat is number {
  const a = asNum(lat), b = asNum(lng);
  return a != null && b != null && Math.abs(a) <= 90 && Math.abs(b) <= 180;
}

export class BiogpsParser {
  static toGenericFromGroup(groups: BiogpsRawGroup[]): GenericGPS[] {
    const items = groups?.flatMap(g => (Array.isArray((g as any)?.items) ? (g as any).items : [])) ?? [];

    return items
      .map((item: BiogpsRawItem) => {
        const lat = asNum(item?.lat);
        const lng = asNum(item?.lng);
        if (!isValidCoord(lat, lng)) return null;

        const ts = pickTimestampSeconds(item);
        const last = mapLastLocations(item);

        const speed = asNum(item?.speed) ?? undefined;
        const totalDistance = asNum(item?.total_distance) ?? undefined;

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

        return <GenericGPS> {
          licensePlate,
          status: item?.device_data ? 'online' : 'offline',
          currentLocation: {lat, lng, timestamp: ts},
          lastLocations: last,
          speed,
          totalDistance,
          referenceId: item.device_data?.traccar?.latestPosition_id.toString(),
          provider: GPSProviderEnum.BIOGPS,
          timestamp: ts.toString(),
        };
      }) as GenericGPS[];
  }

  /** HISTORY → GenericGPS[] */
  static toGenericFromHistory(history: BiogpsRawHistory, licensePlate: string): GenericGPS[] {
    return history.items
      .map((it: any) => {
        const lat = asNum(it?.latitude);
        const lng = asNum(it?.longitude);
        if (!isValidCoord(lat, lng)) return null;

        const ts = parseGpsTimeToUnixSeconds(it?.raw_time) ?? 0;
        const speed = asNum(it?.speed) ?? undefined;
        const totalDistance = asNum(it?.distance ?? it?.total_distance) ?? undefined;

        const referenceId = String(it?.id ?? it?.reference_id ?? '');

        return <GenericGPS> {
          licensePlate,
          status: it?.valid ? 'online' : 'offline',
          currentLocation: {lat, lng, timestamp: ts},
          lastLocations: [], // historial llega sin lastLocations
          speed,
          totalDistance,
          referenceId,
          provider: GPSProviderEnum.BIOGPS,
          timestamp: it?.raw_time
        };
      })
      .filter(Boolean) as GenericGPS[];
  }

  /** Path limpio listo para mapear o analizar */
  static buildCleanPath(
    readings: GenericGPS[],
    cfg?: { kalman?: { q?: number; r?: number; maxDt?: number }; rdpEpsMeters?: number }
  ): GpsPoint[] {
    return buildCleanPathFromGeneric(readings, cfg);
  }
}
