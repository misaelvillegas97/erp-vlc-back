import { ApiProperty } from '@nestjs/swagger';

export class ActiveSessionsCountDto {
  @ApiProperty({description: 'Total number of active sessions'})
  count: number;
}

export class AverageDurationDto {
  @ApiProperty({description: 'Average duration of active sessions in minutes'})
  averageMinutes: number;
}

export class TotalDistanceDto {
  @ApiProperty({description: 'Total distance traveled by all active sessions in kilometers'})
  totalKm: number;
}

export class VehiclesInUsePercentageDto {
  @ApiProperty({description: 'Percentage of vehicles currently in use'})
  percentage: number;

  @ApiProperty({description: 'Number of vehicles currently in use'})
  activeCount: number;

  @ApiProperty({description: 'Total number of vehicles'})
  totalCount: number;
}

export class SessionDurationItemDto {
  @ApiProperty({description: 'Session ID'})
  sessionId: string;

  @ApiProperty({description: 'Driver name'})
  driverName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  vehicleLicensePlate: string;

  @ApiProperty({description: 'Duration in minutes'})
  durationMinutes: number;
}

export class SessionDurationChartDto {
  @ApiProperty({type: [ SessionDurationItemDto ], description: 'List of sessions with their durations'})
  sessions: SessionDurationItemDto[];
}

export class AverageSpeedItemDto {
  @ApiProperty({description: 'Session ID'})
  sessionId: string;

  @ApiProperty({description: 'Driver name'})
  driverName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  vehicleLicensePlate: string;

  @ApiProperty({description: 'Average speed in km/h'})
  averageSpeed: number;
}

export class AverageSpeedChartDto {
  @ApiProperty({type: [ AverageSpeedItemDto ], description: 'List of sessions with their average speeds'})
  sessions: AverageSpeedItemDto[];
}

export class MapVehicleDto {
  @ApiProperty({description: 'Session ID'})
  sessionId: string;

  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Vehicle license plate'})
  vehicleLicensePlate: string;

  @ApiProperty({description: 'Driver name'})
  driverName: string;

  @ApiProperty({description: 'Current latitude'})
  latitude: number;

  @ApiProperty({description: 'Current longitude'})
  longitude: number;

  @ApiProperty({description: 'Current heading in degrees'})
  heading: number;

  @ApiProperty({description: 'Current speed in km/h'})
  speed: number;
}

export class MapDataDto {
  @ApiProperty({type: [ MapVehicleDto ], description: 'List of vehicles with their current locations'})
  vehicles: MapVehicleDto[];
}

export class ActiveSessionsDashboardDto {
  @ApiProperty({type: ActiveSessionsCountDto, description: 'Number of active sessions'})
  activeSessions: ActiveSessionsCountDto;

  @ApiProperty({type: AverageDurationDto, description: 'Average duration of active sessions'})
  averageDuration: AverageDurationDto;

  @ApiProperty({type: TotalDistanceDto, description: 'Total distance traveled by active sessions'})
  totalDistance: TotalDistanceDto;

  @ApiProperty({type: VehiclesInUsePercentageDto, description: 'Percentage of vehicles in use'})
  vehiclesInUsePercentage: VehiclesInUsePercentageDto;

  @ApiProperty({type: SessionDurationChartDto, description: 'Session duration chart data'})
  sessionDurationChart: SessionDurationChartDto;

  @ApiProperty({type: AverageSpeedChartDto, description: 'Average speed chart data'})
  averageSpeedChart: AverageSpeedChartDto;

  @ApiProperty({type: MapDataDto, description: 'Real-time map data'})
  mapData: MapDataDto;
}
