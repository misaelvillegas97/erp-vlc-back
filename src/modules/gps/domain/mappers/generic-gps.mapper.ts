import { GpsEntity } from '@modules/gps/domain/entities/gps.entity';

export class GenericGpsMapper {
  readonly latitude: number;
  readonly longitude: number;
  readonly timestamp: number;
  readonly speed: number;

  constructor(values: Partial<GenericGpsMapper>) {
    Object.assign(this, values);
  }

  static toDomain(gps: GpsEntity): GenericGpsMapper {
    return new GenericGpsMapper({
      latitude: gps.latitude,
      longitude: gps.longitude,
      timestamp: gps.timestamp,
      speed: gps.speed,
    });
  }

  static toDomainAll(gpsList: GpsEntity[]): GenericGpsMapper[] {
    return gpsList.map(gps => this.toDomain(gps));
  }
}
