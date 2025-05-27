import { ApiProperty }                        from '@nestjs/swagger';
import { MaintenanceStatus, MaintenanceType } from '../entities/maintenance-record.entity';

export class MaintenanceStatisticsDto {
  @ApiProperty({description: 'Number of pending maintenance records'})
  pendingMaintenanceCount: number;

  @ApiProperty({description: 'Number of completed maintenance records'})
  completedMaintenanceCount: number;

  @ApiProperty({description: 'Number of active alerts'})
  activeAlertsCount: number;

  @ApiProperty({description: 'Number of upcoming maintenance records'})
  upcomingMaintenanceCount: number;

  @ApiProperty({description: 'Maintenance records grouped by status'})
  maintenanceByStatus: { status: MaintenanceStatus; count: number }[];

  @ApiProperty({description: 'Maintenance records grouped by month'})
  maintenanceByMonth: { month: string; count: number }[];

  @ApiProperty({description: 'Maintenance records grouped by type'})
  maintenanceByType: { type: MaintenanceType; count: number }[];

  @ApiProperty({description: 'Upcoming maintenance records grouped by vehicle and month'})
  upcomingMaintenanceByVehicle: { month: string; vehicleCount: number }[];

  @ApiProperty({description: 'List of active alerts'})
  activeAlerts: any[];
}
