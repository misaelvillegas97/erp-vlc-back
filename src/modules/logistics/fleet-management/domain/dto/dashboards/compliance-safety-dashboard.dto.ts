import { ApiProperty } from '@nestjs/swagger';

export class ExpiredSessionsDto {
  @ApiProperty({description: 'Number of expired sessions'})
  count: number;

  @ApiProperty({description: 'Percentage of expired sessions over total sessions'})
  percentage: number;
}

export class SpeedViolationsDto {
  @ApiProperty({description: 'Number of speed violations'})
  count: number;

  @ApiProperty({description: 'Speed limit in km/h'})
  speedLimit: number;
}

export class ExpiringLicensesDto {
  @ApiProperty({description: 'Number of licenses expiring in the next 30 days'})
  count: number;
}

export class ExpiredSessionsTrendItemDto {
  @ApiProperty({description: 'Month in YYYY-MM format'})
  month: string;

  @ApiProperty({description: 'Month label (e.g., "Jan 2023")'})
  label: string;

  @ApiProperty({description: 'Percentage of expired sessions in this month'})
  percentage: number;
}

export class ExpiredSessionsTrendChartDto {
  @ApiProperty({type: [ ExpiredSessionsTrendItemDto ], description: 'Expired sessions trend data'})
  data: ExpiredSessionsTrendItemDto[];
}

export class IncidentsByVehicleTypeItemDto {
  @ApiProperty({description: 'Vehicle type (SEDAN, SUV, PICKUP, etc.)'})
  vehicleType: string;

  @ApiProperty({description: 'Vehicle type label'})
  typeLabel: string;

  @ApiProperty({description: 'Number of incidents with this vehicle type'})
  incidentCount: number;
}

export class IncidentsByVehicleTypeChartDto {
  @ApiProperty({type: [ IncidentsByVehicleTypeItemDto ], description: 'Incidents by vehicle type data'})
  data: IncidentsByVehicleTypeItemDto[];
}

export class IncidentsByDriverItemDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Number of incidents reported'})
  incidentCount: number;
}

export class IncidentsByDriverChartDto {
  @ApiProperty({type: [ IncidentsByDriverItemDto ], description: 'Drivers with most incidents'})
  drivers: IncidentsByDriverItemDto[];
}

export class ExpiringLicenseItemDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'License type'})
  licenseType: string;

  @ApiProperty({description: 'Expiry date'})
  expiryDate: string;

  @ApiProperty({description: 'Days until expiry'})
  daysUntilExpiry: number;
}

export class ExpiringLicensesTableDto {
  @ApiProperty({type: [ ExpiringLicenseItemDto ], description: 'Licenses about to expire'})
  licenses: ExpiringLicenseItemDto[];
}

export class MaintenanceAlertItemDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle brand'})
  brand: string;

  @ApiProperty({description: 'Vehicle model'})
  model: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Alert type (date or odometer)'})
  alertType: 'date' | 'odometer';

  @ApiProperty({description: 'Due date for maintenance', required: false})
  dueDate?: string;

  @ApiProperty({description: 'Due kilometers for maintenance', required: false})
  dueKm?: number;

  @ApiProperty({description: 'Days until maintenance is due', required: false})
  daysUntilDue?: number;

  @ApiProperty({description: 'Kilometers until maintenance is due', required: false})
  kmUntilDue?: number;
}

export class MaintenanceAlertsTableDto {
  @ApiProperty({type: [ MaintenanceAlertItemDto ], description: 'Pending maintenance alerts'})
  alerts: MaintenanceAlertItemDto[];
}

export class SpeedViolationItemDto {
  @ApiProperty({description: 'Session ID'})
  sessionId: string;

  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Timestamp of the violation'})
  timestamp: string;

  @ApiProperty({description: 'Recorded speed in km/h'})
  speed: number;

  @ApiProperty({description: 'Speed limit in km/h'})
  speedLimit: number;

  @ApiProperty({description: 'Excess speed (speed - speedLimit)'})
  excess: number;
}

export class SpeedViolationsTableDto {
  @ApiProperty({type: [ SpeedViolationItemDto ], description: 'Speed violations data'})
  violations: SpeedViolationItemDto[];
}

export class ComplianceSafetyDashboardDto {
  @ApiProperty({type: ExpiredSessionsDto, description: 'Expired sessions data'})
  expiredSessions: ExpiredSessionsDto;

  @ApiProperty({type: SpeedViolationsDto, description: 'Speed violations data'})
  speedViolations: SpeedViolationsDto;

  @ApiProperty({type: ExpiringLicensesDto, description: 'Expiring licenses data'})
  expiringLicenses: ExpiringLicensesDto;

  @ApiProperty({type: ExpiredSessionsTrendChartDto, description: 'Expired sessions trend chart data'})
  expiredSessionsTrendChart: ExpiredSessionsTrendChartDto;

  @ApiProperty({type: IncidentsByVehicleTypeChartDto, description: 'Incidents by vehicle type chart data'})
  incidentsByVehicleTypeChart: IncidentsByVehicleTypeChartDto;

  @ApiProperty({type: IncidentsByDriverChartDto, description: 'Incidents by driver chart data'})
  incidentsByDriverChart: IncidentsByDriverChartDto;

  @ApiProperty({type: ExpiringLicensesTableDto, description: 'Expiring licenses table data'})
  expiringLicensesTable: ExpiringLicensesTableDto;

  @ApiProperty({type: MaintenanceAlertsTableDto, description: 'Maintenance alerts table data'})
  maintenanceAlertsTable: MaintenanceAlertsTableDto;

  @ApiProperty({type: SpeedViolationsTableDto, description: 'Speed violations table data'})
  speedViolationsTable: SpeedViolationsTableDto;
}
