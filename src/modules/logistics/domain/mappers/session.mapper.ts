import { VehicleSessionEntity, VehicleSessionStatus } from '@modules/logistics/domain/entities/vehicle-session.entity';
import { UserMapper }                                 from '@modules/users/domain/mappers/user.mapper';
import { GenericGpsMapper }                           from '@modules/logistics/domain/mappers/generic-gps.mapper';
import { VehicleMapper }                              from '@modules/logistics/domain/mappers/vehicle.mapper';
import { User }                                       from '@modules/users/domain/user';

export class SessionMapper {
  readonly id: string;
  readonly driverId: string;
  readonly vehicleId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly status: VehicleSessionStatus;
  readonly initialOdometer: number;
  readonly finalOdometer: number;
  readonly purpose: string;
  readonly observations: string;
  readonly incidents: any;
  readonly gps: GenericGpsMapper[];
  readonly locations: any;
  readonly driver: User;
  readonly vehicle: VehicleMapper;

  constructor(value: Partial<SessionMapper>) {
    Object.assign(this, value);
  }

  static toDomain(entity: VehicleSessionEntity) {
    return new SessionMapper({
      id: entity.id,
      driverId: entity.driverId,
      vehicleId: entity.vehicleId,
      startTime: entity.startTime,
      endTime: entity.endTime,
      status: entity.status,
      initialOdometer: entity.initialOdometer,
      finalOdometer: entity.finalOdometer,
      purpose: entity.purpose,
      observations: entity.observations,
      incidents: entity.incidents,
      gps: entity.gps && GenericGpsMapper.toDomainAll(entity.gps),
      locations: entity.locations,
      driver: entity.driver && UserMapper.toDomain(entity.driver),
      vehicle: entity.vehicle && VehicleMapper.toDomain(entity.vehicle),
    });
  }

  static toDomainAll(entities: VehicleSessionEntity[]) {
    return entities.map(entity => this.toDomain(entity));
  }
}
