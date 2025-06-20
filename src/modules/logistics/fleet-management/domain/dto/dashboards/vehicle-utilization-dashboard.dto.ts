import { ApiProperty } from '@nestjs/swagger';

export class TotalActiveVehiclesDto {
  @ApiProperty({description: 'Total number of active vehicles'})
  count: number;
}

export class MostUsedVehicleDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle display name (brand + model)'})
  displayName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Number of sessions'})
  sessionCount: number;
}

export class AverageSessionsPerVehicleDto {
  @ApiProperty({description: 'Average number of sessions per vehicle'})
  average: number;
}

export class AverageDistancePerVehicleDto {
  @ApiProperty({description: 'Average distance per vehicle in kilometers'})
  averageKm: number;
}

export class TopVehiclesByUsageItemDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle display name (brand + model)'})
  displayName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Number of sessions'})
  sessionCount: number;
}

export class TopVehiclesByUsageChartDto {
  @ApiProperty({type: [ TopVehiclesByUsageItemDto ], description: 'Top vehicles by usage'})
  vehicles: TopVehiclesByUsageItemDto[];
}

export class TopVehiclesByDistanceItemDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle display name (brand + model)'})
  displayName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Total distance in kilometers'})
  totalDistance: number;
}

export class TopVehiclesByDistanceChartDto {
  @ApiProperty({type: [ TopVehiclesByDistanceItemDto ], description: 'Top vehicles by distance traveled'})
  vehicles: TopVehiclesByDistanceItemDto[];
}

export class UsageByVehicleTypeItemDto {
  @ApiProperty({description: 'Vehicle type (SEDAN, SUV, PICKUP, etc.)'})
  vehicleType: string;

  @ApiProperty({description: 'Vehicle type label'})
  typeLabel: string;

  @ApiProperty({description: 'Number of sessions with this vehicle type'})
  sessionCount: number;
}

export class UsageByVehicleTypeChartDto {
  @ApiProperty({type: [ UsageByVehicleTypeItemDto ], description: 'Usage by vehicle type data'})
  data: UsageByVehicleTypeItemDto[];
}

export class CostPerKmByVehicleItemDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle display name (brand + model)'})
  displayName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Cost per kilometer'})
  costPerKm: number;
}

export class CostPerKmByVehicleChartDto {
  @ApiProperty({type: [ CostPerKmByVehicleItemDto ], description: 'Cost per km by vehicle data'})
  vehicles: CostPerKmByVehicleItemDto[];
}

export class VehicleOdometerItemDto {
  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Vehicle display name (brand + model)'})
  displayName: string;

  @ApiProperty({description: 'Vehicle license plate'})
  licensePlate: string;

  @ApiProperty({description: 'Current odometer reading in kilometers'})
  odometerReading: number;
}

export class VehicleOdometerChartDto {
  @ApiProperty({type: [ VehicleOdometerItemDto ], description: 'Vehicle odometer data'})
  vehicles: VehicleOdometerItemDto[];
}

export class VehicleUtilizationDashboardDto {
  @ApiProperty({type: TotalActiveVehiclesDto, description: 'Total number of active vehicles'})
  totalActiveVehicles: TotalActiveVehiclesDto;

  @ApiProperty({type: MostUsedVehicleDto, description: 'Most used vehicle'})
  mostUsedVehicle: MostUsedVehicleDto;

  @ApiProperty({type: AverageSessionsPerVehicleDto, description: 'Average sessions per vehicle'})
  averageSessionsPerVehicle: AverageSessionsPerVehicleDto;

  @ApiProperty({type: AverageDistancePerVehicleDto, description: 'Average distance per vehicle'})
  averageDistancePerVehicle: AverageDistancePerVehicleDto;

  @ApiProperty({type: TopVehiclesByUsageChartDto, description: 'Top vehicles by usage chart data'})
  topVehiclesByUsageChart: TopVehiclesByUsageChartDto;

  @ApiProperty({type: TopVehiclesByDistanceChartDto, description: 'Top vehicles by distance chart data'})
  topVehiclesByDistanceChart: TopVehiclesByDistanceChartDto;

  @ApiProperty({type: UsageByVehicleTypeChartDto, description: 'Usage by vehicle type chart data'})
  usageByVehicleTypeChart: UsageByVehicleTypeChartDto;

  @ApiProperty({type: CostPerKmByVehicleChartDto, description: 'Cost per km by vehicle chart data'})
  costPerKmByVehicleChart: CostPerKmByVehicleChartDto;

  @ApiProperty({type: VehicleOdometerChartDto, description: 'Vehicle odometer chart data'})
  vehicleOdometerChart: VehicleOdometerChartDto;
}
