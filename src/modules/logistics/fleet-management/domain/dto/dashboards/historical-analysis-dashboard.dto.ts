import { ApiProperty } from '@nestjs/swagger';

export class TotalSessionsDto {
  @ApiProperty({description: 'Total number of sessions in the period'})
  count: number;
}

export class TotalDistanceDto {
  @ApiProperty({description: 'Total distance traveled in the period in kilometers'})
  totalKm: number;
}

export class TotalTimeInRouteDto {
  @ApiProperty({description: 'Total time in route in minutes'})
  totalMinutes: number;
}

export class AverageDistancePerSessionDto {
  @ApiProperty({description: 'Average distance per session in kilometers'})
  averageKm: number;
}

export class SessionsPerDayItemDto {
  @ApiProperty({description: 'Date in YYYY-MM-DD format'})
  date: string;

  @ApiProperty({description: 'Number of sessions on that day'})
  count: number;
}

export class SessionsPerDayChartDto {
  @ApiProperty({type: [ SessionsPerDayItemDto ], description: 'Sessions per day data'})
  data: SessionsPerDayItemDto[];
}

export class AverageDurationByDayOfWeekItemDto {
  @ApiProperty({description: 'Day of week name (Monday, Tuesday, etc.)'})
  dayOfWeek: string;

  @ApiProperty({description: 'Day number (0-6, where 0 is Sunday)'})
  dayNumber: number;

  @ApiProperty({description: 'Average duration in minutes'})
  averageDurationMinutes: number;
}

export class AverageDurationByDayOfWeekChartDto {
  @ApiProperty({type: [ AverageDurationByDayOfWeekItemDto ], description: 'Average duration by day of week data'})
  data: AverageDurationByDayOfWeekItemDto[];
}

export class SessionStatusDistributionItemDto {
  @ApiProperty({description: 'Session status (ACTIVE, COMPLETED, CANCELLED, EXPIRED)'})
  status: string;

  @ApiProperty({description: 'Translated status label'})
  statusLabel: string;

  @ApiProperty({description: 'Number of sessions with this status'})
  count: number;
}

export class SessionStatusDistributionChartDto {
  @ApiProperty({type: [ SessionStatusDistributionItemDto ], description: 'Session status distribution data'})
  data: SessionStatusDistributionItemDto[];
}

export class SessionDurationHistogramItemDto {
  @ApiProperty({description: 'Duration range (e.g., "0-1h")'})
  range: string;

  @ApiProperty({description: 'Minimum value of the range in minutes'})
  minMinutes: number;

  @ApiProperty({description: 'Maximum value of the range in minutes'})
  maxMinutes: number;

  @ApiProperty({description: 'Number of sessions in this range'})
  count: number;
}

export class SessionDurationHistogramChartDto {
  @ApiProperty({type: [ SessionDurationHistogramItemDto ], description: 'Session duration histogram data'})
  data: SessionDurationHistogramItemDto[];
}

export class HistoricalAnalysisDashboardDto {
  @ApiProperty({type: TotalSessionsDto, description: 'Total number of sessions'})
  totalSessions: TotalSessionsDto;

  @ApiProperty({type: TotalDistanceDto, description: 'Total distance traveled'})
  totalDistance: TotalDistanceDto;

  @ApiProperty({type: TotalTimeInRouteDto, description: 'Total time in route'})
  totalTimeInRoute: TotalTimeInRouteDto;

  @ApiProperty({type: AverageDistancePerSessionDto, description: 'Average distance per session'})
  averageDistancePerSession: AverageDistancePerSessionDto;

  @ApiProperty({type: SessionsPerDayChartDto, description: 'Sessions per day chart data'})
  sessionsPerDayChart: SessionsPerDayChartDto;

  @ApiProperty({type: AverageDurationByDayOfWeekChartDto, description: 'Average duration by day of week chart data'})
  averageDurationByDayOfWeekChart: AverageDurationByDayOfWeekChartDto;

  @ApiProperty({type: SessionStatusDistributionChartDto, description: 'Session status distribution chart data'})
  sessionStatusDistributionChart: SessionStatusDistributionChartDto;

  @ApiProperty({type: SessionDurationHistogramChartDto, description: 'Session duration histogram chart data'})
  sessionDurationHistogramChart: SessionDurationHistogramChartDto;
}
