import { FuelRecordEntity, GasStationBrand } from '@modules/logistics/fuel-management/domain/entities/fuel-record.entity';
import { FuelTypeEnum }                      from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';
import { VehicleMapper }                     from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';

export class FuelRecordMapper {
  id: string;
  vehicleId: string;
  vehicle?: VehicleMapper;
  userId: string;
  date: string;
  initialOdometer: number;
  finalOdometer: number;
  liters: number;
  cost: number;
  efficiency: number;
  costPerKm: number;
  gasStation: GasStationBrand;
  fuelType: FuelTypeEnum;
  notes: string;
  createdAt: Date;

  // Generated properties
  distance: number;

  constructor(values: Partial<FuelRecordMapper>) {
    Object.assign(this, values);
  }

  static toDomain(entity: FuelRecordEntity): FuelRecordMapper {
    const distance = entity.finalOdometer - entity.initialOdometer;

    return new FuelRecordMapper({
      id: entity.id,
      vehicleId: entity.vehicleId,
      vehicle: entity.vehicle ? VehicleMapper.toDomain(entity.vehicle) : undefined,
      userId: entity.userId,
      date: entity.date,
      initialOdometer: entity.initialOdometer,
      finalOdometer: entity.finalOdometer,
      liters: entity.liters,
      cost: entity.cost,
      efficiency: entity.efficiency,
      costPerKm: entity.costPerKm,
      gasStation: entity.gasStation,
      fuelType: entity.fuelType,
      notes: entity.notes,
      createdAt: entity.createdAt,
      distance,
    });
  }

  static toDomainAll(entities: FuelRecordEntity[]): FuelRecordMapper[] {
    return entities.map(entity => this.toDomain(entity));
  }
}
