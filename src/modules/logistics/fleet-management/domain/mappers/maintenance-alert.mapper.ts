import {
  AlertStatus,
  AlertType,
  MaintenanceAlertEntity
}                        from '@modules/logistics/fleet-management/domain/entities/maintenance-alert.entity';
import { VehicleMapper } from '@modules/logistics/fleet-management/domain/mappers/vehicle.mapper';
import { I18nContext }   from 'nestjs-i18n';

export class MaintenanceAlertMapper {
  id: string;
  vehicleId: string;
  type: AlertType;
  status: AlertStatus;
  title: string;
  description: string;
  alertKey: string;
  alertParams: Record<string, any>;
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
    let title: string, description: string;

    // If we have an alertKey and I18nContext is available, translate the title and description
    if (entity.alertKey && I18nContext.current()) {
      const i18n = I18nContext.current();
      const titleKey = `${ entity.alertKey }.title`;
      const descriptionKey = `${ entity.alertKey }.description`;

      if (i18n.t(titleKey, {args: entity.alertParams})) {
        title = i18n.t(titleKey, {args: entity.alertParams});
      }

      if (i18n.t(descriptionKey, {args: entity.alertParams})) {
        description = i18n.t(descriptionKey, {args: entity.alertParams});
      }
    }

    return new MaintenanceAlertMapper({
      id: entity.id,
      vehicleId: entity.vehicleId,
      type: entity.type,
      status: entity.status,
      title: title,
      description: description,
      alertKey: entity.alertKey,
      alertParams: entity.alertParams,
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
