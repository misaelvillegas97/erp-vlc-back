import { ApiProperty } from '@nestjs/swagger';

export class TotalGpsPointsDto {
  @ApiProperty({description: 'Total number of GPS points recorded'})
  count: number;
}

export class MaxSpeedDto {
  @ApiProperty({description: 'Maximum speed recorded in km/h'})
  maxSpeedKmh: number;

  @ApiProperty({description: 'Session ID where the maximum speed was recorded'})
  sessionId: string;

  @ApiProperty({description: 'Driver ID'})
  driverId: string;

  @ApiProperty({description: 'Vehicle ID'})
  vehicleId: string;

  @ApiProperty({description: 'Timestamp when the maximum speed was recorded'})
  timestamp: string;
}

export class AverageDistanceDto {
  @ApiProperty({description: 'Average distance per session in kilometers'})
  averageKm: number;
}

export class MostVisitedAreaItemDto {
  @ApiProperty({description: 'Latitude of the area'})
  latitude: number;

  @ApiProperty({description: 'Longitude of the area'})
  longitude: number;

  @ApiProperty({description: 'Number of GPS points in this area'})
  count: number;
}

export class MostVisitedAreasDto {
  @ApiProperty({type: [ MostVisitedAreaItemDto ], description: 'Most visited areas'})
  areas: MostVisitedAreaItemDto[];
}

export class SpeedDistributionItemDto {
  @ApiProperty({description: 'Speed range (e.g., "0-20 km/h")'})
  range: string;

  @ApiProperty({description: 'Minimum speed of the range'})
  minSpeed: number;

  @ApiProperty({description: 'Maximum speed of the range'})
  maxSpeed: number;

  @ApiProperty({description: 'Number of GPS points in this speed range'})
  count: number;
}

export class SpeedDistributionChartDto {
  @ApiProperty({type: [ SpeedDistributionItemDto ], description: 'Speed distribution data'})
  data: SpeedDistributionItemDto[];
}

export class SessionStartTimeDistributionItemDto {
  @ApiProperty({description: 'Hour of the day (0-23)'})
  hour: number;

  @ApiProperty({description: 'Hour label (e.g., "8:00")'})
  label: string;

  @ApiProperty({description: 'Number of sessions started in this hour'})
  count: number;
}

export class SessionStartTimeDistributionChartDto {
  @ApiProperty({type: [ SessionStartTimeDistributionItemDto ], description: 'Session start time distribution data'})
  data: SessionStartTimeDistributionItemDto[];
}

export class SessionEndTimeDistributionItemDto {
  @ApiProperty({description: 'Hour of the day (0-23)'})
  hour: number;

  @ApiProperty({description: 'Hour label (e.g., "17:00")'})
  label: string;

  @ApiProperty({description: 'Number of sessions ended in this hour'})
  count: number;
}

export class SessionEndTimeDistributionChartDto {
  @ApiProperty({type: [ SessionEndTimeDistributionItemDto ], description: 'Session end time distribution data'})
  data: SessionEndTimeDistributionItemDto[];
}

export class HeatMapPointDto {
  @ApiProperty({description: 'Latitude of the point'})
  latitude: number;

  @ApiProperty({description: 'Longitude of the point'})
  longitude: number;

  @ApiProperty({description: 'Weight (intensity) of the point'})
  weight: number;
}

export class HeatMapDataDto {
  @ApiProperty({type: [ HeatMapPointDto ], description: 'Heat map points'})
  points: HeatMapPointDto[];
}

export class FrequentRoutePathPointDto {
  @ApiProperty({description: 'Latitude of the point'})
  latitude: number;

  @ApiProperty({description: 'Longitude of the point'})
  longitude: number;
}

export class FrequentRouteDto {
  @ApiProperty({description: 'Route ID'})
  id: string;

  @ApiProperty({description: 'Number of times this route has been traveled'})
  count: number;

  @ApiProperty({type: [ FrequentRoutePathPointDto ], description: 'Path points of the route'})
  path: FrequentRoutePathPointDto[];
}

export class FrequentRoutesDataDto {
  @ApiProperty({type: [ FrequentRouteDto ], description: 'Frequent routes data'})
  routes: FrequentRouteDto[];
}

export class GeographicalAnalysisDashboardDto {
  @ApiProperty({type: TotalGpsPointsDto, description: 'Total GPS points recorded'})
  totalGpsPoints: TotalGpsPointsDto;

  @ApiProperty({type: MaxSpeedDto, description: 'Maximum speed recorded'})
  maxSpeed: MaxSpeedDto;

  @ApiProperty({type: AverageDistanceDto, description: 'Average distance per session'})
  averageDistance: AverageDistanceDto;

  @ApiProperty({type: MostVisitedAreasDto, description: 'Most visited areas'})
  mostVisitedAreas: MostVisitedAreasDto;

  @ApiProperty({type: SpeedDistributionChartDto, description: 'Speed distribution chart data'})
  speedDistributionChart: SpeedDistributionChartDto;

  @ApiProperty({type: SessionStartTimeDistributionChartDto, description: 'Session start time distribution chart data'})
  sessionStartTimeDistributionChart: SessionStartTimeDistributionChartDto;

  @ApiProperty({type: SessionEndTimeDistributionChartDto, description: 'Session end time distribution chart data'})
  sessionEndTimeDistributionChart: SessionEndTimeDistributionChartDto;

  @ApiProperty({type: HeatMapDataDto, description: 'Heat map data'})
  heatMapData: HeatMapDataDto;

  @ApiProperty({type: FrequentRoutesDataDto, description: 'Frequent routes data'})
  frequentRoutesData: FrequentRoutesDataDto;
}
