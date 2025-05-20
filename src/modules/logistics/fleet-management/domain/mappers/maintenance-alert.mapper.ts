import {
  AlertStatus,
  AlertType,
  MaintenanceAlertEntity
} from '@modules/logistics/fleet-management/domain/entities/maintenance-alert.entity';
import { VehicleMapper } from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';

export class MaintenanceAlertMapper {
  id: string;
  vehicleId: string;
  type: AlertType;
  status: AlertStatus;
  title: string;
  description: string;
  dueDate: string;
  thresholdKm: number;
  notificationSent: boolean;
  priority: number;
  maintenanceRecordId: string;
  createdAt: Date;

  // Relationships
  vehicle: VehicleMapper;

  constructor(values: Partial<MaintenanceAlertMapper>) {
    Object.assign(this, values);
  }

  static toDomain(entity: MaintenanceAlertEntity): MaintenanceAlertMapper {
    return new MaintenanceAlertMapper({
      id: entity.id,
      vehicleId: entity.vehicleId,
      type: entity.type,
      status: entity.status,
      title: entity.title,
      description: entity.description,
      dueDate: entity.dueDate,
      thresholdKm: entity.thresholdKm,
      notificationSent: entity.notificationSent,
      priority: entity.priority,
      maintenanceRecordId: entity.maintenanceRecordId,
      createdAt: entity.createdAt,
      vehicle: entity.vehicle && VehicleMapper.toDomain(entity.vehicle),
    });
  }

  static toDomainAll(entities: MaintenanceAlertEntity[]): MaintenanceAlertMapper[] {
    return entities.map(entity => this.toDomain(entity));
  }
}
