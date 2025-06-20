import { ApiProperty } from '@nestjs/swagger';

export class TotalActiveDriversDto {
  @ApiProperty({description: 'Total number of active drivers'})
  count: number;
}

export class MostActiveDriverDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Number of sessions'})
  sessionCount: number;
}

export class AverageSessionsPerDriverDto {
  @ApiProperty({description: 'Average number of sessions per driver'})
  average: number;
}

export class AverageDistancePerDriverDto {
  @ApiProperty({description: 'Average distance per driver in kilometers'})
  averageKm: number;
}

export class TopDriversBySessionsItemDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Number of sessions'})
  sessionCount: number;
}

export class TopDriversBySessionsChartDto {
  @ApiProperty({type: [ TopDriversBySessionsItemDto ], description: 'Top drivers by number of sessions'})
  drivers: TopDriversBySessionsItemDto[];
}

export class TopDriversByDistanceItemDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Total distance in kilometers'})
  totalDistance: number;
}

export class TopDriversByDistanceChartDto {
  @ApiProperty({type: [ TopDriversByDistanceItemDto ], description: 'Top drivers by distance traveled'})
  drivers: TopDriversByDistanceItemDto[];
}

export class SessionsByLicenseTypeItemDto {
  @ApiProperty({description: 'License type (A, B, C, D, E)'})
  licenseType: string;

  @ApiProperty({description: 'License type description'})
  licenseLabel: string;

  @ApiProperty({description: 'Number of sessions with this license type'})
  sessionCount: number;
}

export class SessionsByLicenseTypeChartDto {
  @ApiProperty({type: [ SessionsByLicenseTypeItemDto ], description: 'Sessions by license type data'})
  data: SessionsByLicenseTypeItemDto[];
}

export class DriverActivityTrendDriverDto {
  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Driver first name'})
  firstName: string;

  @ApiProperty({description: 'Driver last name'})
  lastName: string;

  @ApiProperty({description: 'Array of session counts by week', type: [ Number ]})
  sessionsByWeek: number[];
}

export class DriverActivityTrendChartDto {
  @ApiProperty({description: 'Array of weeks in YYYY-MM-DD format (start of week)', type: [ String ]})
  weeks: string[];

  @ApiProperty({type: [ DriverActivityTrendDriverDto ], description: 'Driver activity data by week'})
  drivers: DriverActivityTrendDriverDto[];
}

export class DriverPerformanceDashboardDto {
  @ApiProperty({type: TotalActiveDriversDto, description: 'Total number of active drivers'})
  totalActiveDrivers: TotalActiveDriversDto;

  @ApiProperty({type: MostActiveDriverDto, description: 'Most active driver'})
  mostActiveDriver: MostActiveDriverDto;

  @ApiProperty({type: AverageSessionsPerDriverDto, description: 'Average sessions per driver'})
  averageSessionsPerDriver: AverageSessionsPerDriverDto;

  @ApiProperty({type: AverageDistancePerDriverDto, description: 'Average distance per driver'})
  averageDistancePerDriver: AverageDistancePerDriverDto;

  @ApiProperty({type: TopDriversBySessionsChartDto, description: 'Top drivers by sessions chart data'})
  topDriversBySessionsChart: TopDriversBySessionsChartDto;

  @ApiProperty({type: TopDriversByDistanceChartDto, description: 'Top drivers by distance chart data'})
  topDriversByDistanceChart: TopDriversByDistanceChartDto;

  @ApiProperty({type: SessionsByLicenseTypeChartDto, description: 'Sessions by license type chart data'})
  sessionsByLicenseTypeChart: SessionsByLicenseTypeChartDto;

  @ApiProperty({type: DriverActivityTrendChartDto, description: 'Driver activity trend chart data'})
  driverActivityTrendChart: DriverActivityTrendChartDto;
}
