import {
  MaintenanceRecordEntity,
  MaintenanceStatus,
  MaintenanceType
}                        from '@modules/logistics/fleet-management/domain/entities/maintenance-record.entity';
import { VehicleMapper } from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';

export class MaintenanceRecordMapper {
  id: string;
  vehicleId: string;
  date: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  odometer: number;
  description: string;
  cost: number;
  provider: string;
  partsReplaced: { part: string; cost: number; quantity: number }[];
  documents: { id: string; name: string; url: string }[];
  notes: string;
  createdAt: Date;

  // Relationships
  vehicle: VehicleMapper;

  constructor(values: Partial<MaintenanceRecordMapper>) {
    Object.assign(this, values);
  }

  static toDomain(entity: MaintenanceRecordEntity): MaintenanceRecordMapper {
    return new MaintenanceRecordMapper({
      id: entity.id,
      vehicleId: entity.vehicleId,
      date: entity.date,
      type: entity.type,
      status: entity.status,
      odometer: entity.odometer,
      description: entity.description,
      cost: entity.cost,
      provider: entity.provider,
      partsReplaced: entity.partsReplaced,
      documents: entity.documents,
      notes: entity.notes,
      createdAt: entity.createdAt,
      vehicle: entity.vehicle && VehicleMapper.toDomain(entity.vehicle),
    });
  }

  static toDomainAll(entities: MaintenanceRecordEntity[]): MaintenanceRecordMapper[] {
    return entities.map(entity => this.toDomain(entity));
  }
}
