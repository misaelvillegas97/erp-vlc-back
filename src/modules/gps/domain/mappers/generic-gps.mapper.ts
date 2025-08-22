import { GpsEntity }  from '@modules/gps/domain/entities/gps.entity';
import { GenericGPS } from '@modules/gps/domain/interfaces/generic-gps.interface';

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

  static fromEntity(entity: GpsEntity): GenericGPS {
    return {
      currentLocation: {
        lat: entity.latitude,
        lng: entity.longitude,
        timestamp: entity.timestamp
      },
      licensePlate: entity.licensePlate,
      status: entity.status,
      timestamp: entity.timestamp.toString(),
      speed: entity.speed,
      referenceId: entity.referenceId,
      lastLocations: []
    };
  }

  static fromEntityAll(entityList: GpsEntity[]): GenericGPS[] {
    return entityList.map(entity => this.fromEntity(entity));
  }
}
