import { VehicleEntity, VehicleStatus, VehicleType } from '@modules/logistics/fleet-management/domain/entities/vehicle.entity';
import { FuelTypeEnum }                              from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';

export class VehicleMapper {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  type: VehicleType;
  color: string;
  fuelType: FuelTypeEnum;
  tankCapacity: number;
  lastKnownOdometer: number;
  lastRefuelingOdometer: number;
  status: VehicleStatus;
  currentSessionId: string;
  departmentId: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  nextMaintenanceKm: number;
  purchaseDate: string;
  insuranceExpiry: string;
  technicalInspectionExpiry: string;
  notes: string;
  createdAt: Date;

  // Generated properties
  displayName: string;

  constructor(values: Partial<VehicleMapper>) {
    Object.assign(this, values);
  }

  static toDomain(entity: VehicleEntity): VehicleMapper {
    return new VehicleMapper({
      id: entity.id,
      brand: entity.brand,
      model: entity.model,
      year: entity.year,
      licensePlate: entity.licensePlate,
      vin: entity.vin,
      type: entity.type,
      color: entity.color,
      fuelType: entity.fuelType,
      tankCapacity: entity.tankCapacity,
      lastKnownOdometer: entity.lastKnownOdometer,
      lastRefuelingOdometer: entity.lastRefuelingOdometer,
      status: entity.status,
      currentSessionId: entity.currentSessionId,
      departmentId: entity.departmentId,
      lastMaintenanceDate: entity.lastMaintenanceDate,
      nextMaintenanceDate: entity.nextMaintenanceDate,
      nextMaintenanceKm: entity.nextMaintenanceKm,
      purchaseDate: entity.purchaseDate,
      insuranceExpiry: entity.insuranceExpiry,
      technicalInspectionExpiry: entity.technicalInspectionExpiry,
      notes: entity.notes,
      createdAt: entity.createdAt,
      displayName: this.getDisplayName(entity),
    });
  }

  static toDomainAll(entities: VehicleEntity[]): VehicleMapper[] {
    return entities.map(entity => this.toDomain(entity));
  }

  static getDisplayName(vehicle: VehicleEntity): string {
    return `${ vehicle.licensePlate } - ${ vehicle.brand } ${ vehicle.model }`;
  }
}
