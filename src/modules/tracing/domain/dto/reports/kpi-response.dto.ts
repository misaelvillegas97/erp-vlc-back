import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for individual KPI metric
 */
export class KpiMetricDto {
  @ApiProperty({
    description: 'Name of the metric',
    example: 'instances_processed'
  })
  name: string;

  @ApiProperty({
    description: 'Display label for the metric',
    example: 'Instances Processed'
  })
  label: string;

  @ApiProperty({
    description: 'Current value of the metric',
    example: 150
  })
  value: number;

  @ApiPropertyOptional({
    description: 'Previous period value for comparison',
    example: 120
  })
  previousValue?: number;

  @ApiPropertyOptional({
    description: 'Percentage change from previous period',
    example: 25.0
  })
  changePercentage?: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'count'
  })
  unit: string;

  @ApiPropertyOptional({
    description: 'Trend direction',
    enum: [ 'up', 'down', 'stable' ],
    example: 'up'
  })
  trend?: 'up' | 'down' | 'stable';

  @ApiPropertyOptional({
    description: 'Target value if applicable',
    example: 200
  })
  target?: number;

  @ApiPropertyOptional({
    description: 'Performance against target as percentage',
    example: 75.0
  })
  targetPerformance?: number;
}

/**
 * DTO for time series data point
 */
export class TimeSeriesDataPointDto {
  @ApiProperty({
    description: 'Date/time for this data point',
    example: '2025-08-08T00:00:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Value for this time period',
    example: 25
  })
  value: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for this data point',
    example: {workingHours: 8, activeUsers: 5}
  })
  metadata?: Record<string, any>;
}

/**
 * DTO for waste analysis
 */
export class WasteAnalysisDto {
  @ApiProperty({
    description: 'Total waste quantity',
    example: 125.5
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Total cost impact',
    example: 2450.75
  })
  totalCostImpact: number;

  @ApiProperty({
    description: 'Number of waste incidents',
    example: 15
  })
  incidentCount: number;

  @ApiProperty({
    description: 'Average waste per incident',
    example: 8.37
  })
  averagePerIncident: number;

  @ApiProperty({
    description: 'Waste breakdown by reason',
    example: {
      'Quality issues': {quantity: 75.5, cost: 1500.25, incidents: 8},
      'Handling damage': {quantity: 30.0, cost: 600.50, incidents: 4},
      'Expiration': {quantity: 20.0, cost: 350.00, incidents: 3}
    }
  })
  byReason: Record<string, {
    quantity: number;
    cost: number;
    incidents: number;
  }>;

  @ApiPropertyOptional({
    description: 'Waste breakdown by template',
    example: {
      'template-123': {quantity: 85.5, cost: 1700.25, incidents: 10},
      'template-456': {quantity: 40.0, cost: 750.50, incidents: 5}
    }
  })
  byTemplate?: Record<string, {
    quantity: number;
    cost: number;
    incidents: number;
  }>;

  @ApiProperty({
    description: 'Waste trend over time',
    type: [ TimeSeriesDataPointDto ]
  })
  trend: TimeSeriesDataPointDto[];
}

/**
 * DTO for efficiency metrics
 */
export class EfficiencyMetricsDto {
  @ApiProperty({
    description: 'Overall efficiency percentage',
    example: 87.5
  })
  overallEfficiency: number;

  @ApiProperty({
    description: 'Average execution time in seconds',
    example: 3600
  })
  averageExecutionTime: number;

  @ApiProperty({
    description: 'Completion rate percentage',
    example: 95.2
  })
  completionRate: number;

  @ApiProperty({
    description: 'On-time completion rate percentage',
    example: 82.1
  })
  onTimeCompletionRate: number;

  @ApiProperty({
    description: 'Rework rate percentage',
    example: 5.8
  })
  reworkRate: number;

  @ApiPropertyOptional({
    description: 'Efficiency breakdown by template',
    example: {
      'template-123': {efficiency: 90.2, avgTime: 3200, completion: 96.5},
      'template-456': {efficiency: 84.8, avgTime: 4000, completion: 93.9}
    }
  })
  byTemplate?: Record<string, {
    efficiency: number;
    avgTime: number;
    completion: number;
  }>;

  @ApiPropertyOptional({
    description: 'Efficiency breakdown by user',
    example: {
      'user-123': {efficiency: 92.1, avgTime: 3100, completion: 98.0},
      'user-456': {efficiency: 83.2, avgTime: 3900, completion: 92.5}
    }
  })
  byUser?: Record<string, {
    efficiency: number;
    avgTime: number;
    completion: number;
  }>;
}

/**
 * DTO for step-level metrics
 */
export class StepMetricsDto {
  @ApiProperty({
    description: 'Step ID',
    example: 'step-123'
  })
  stepId: string;

  @ApiProperty({
    description: 'Step key',
    example: 'quality_check'
  })
  stepKey: string;

  @ApiProperty({
    description: 'Step name',
    example: 'Quality Control Check'
  })
  stepName: string;

  @ApiProperty({
    description: 'Number of executions',
    example: 150
  })
  executionCount: number;

  @ApiProperty({
    description: 'Average execution time in seconds',
    example: 1800
  })
  averageExecutionTime: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 94.7
  })
  successRate: number;

  @ApiPropertyOptional({
    description: 'Most common issues',
    example: [ 'Missing required field', 'Invalid data format' ]
  })
  commonIssues?: string[];

  @ApiPropertyOptional({
    description: 'Bottleneck score (higher = more bottleneck)',
    example: 7.5
  })
  bottleneckScore?: number;
}

/**
 * DTO for KPI response
 */
export class KpiResponseDto {
  @ApiProperty({
    description: 'Period start date',
    example: '2025-08-01T00:00:00Z'
  })
  periodStart: string;

  @ApiProperty({
    description: 'Period end date',
    example: '2025-08-08T23:59:59Z'
  })
  periodEnd: string;

  @ApiProperty({
    description: 'Grouping period used',
    enum: [ 'day', 'week', 'month' ],
    example: 'day'
  })
  groupBy: 'day' | 'week' | 'month';

  @ApiProperty({
    description: 'Core KPI metrics',
    type: [ KpiMetricDto ]
  })
  metrics: KpiMetricDto[];

  @ApiPropertyOptional({
    description: 'Time series data for trending',
    example: {
      'instances_processed': [
        {timestamp: '2025-08-01T00:00:00Z', value: 20},
        {timestamp: '2025-08-02T00:00:00Z', value: 25}
      ]
    }
  })
  timeSeries?: Record<string, TimeSeriesDataPointDto[]>;

  @ApiPropertyOptional({
    description: 'Waste analysis data',
    type: WasteAnalysisDto
  })
  wasteAnalysis?: WasteAnalysisDto;

  @ApiPropertyOptional({
    description: 'Efficiency metrics',
    type: EfficiencyMetricsDto
  })
  efficiencyMetrics?: EfficiencyMetricsDto;

  @ApiPropertyOptional({
    description: 'Step-level metrics',
    type: [ StepMetricsDto ]
  })
  stepMetrics?: StepMetricsDto[];

  @ApiPropertyOptional({
    description: 'Template breakdown',
    example: {
      'template-123': {
        name: 'Quality Control',
        instances: 85,
        avgTime: 3200,
        efficiency: 90.2
      }
    }
  })
  templateBreakdown?: Record<string, {
    name: string;
    instances: number;
    avgTime: number;
    efficiency: number;
  }>;

  @ApiPropertyOptional({
    description: 'User breakdown',
    example: {
      'user-123': {
        name: 'John Doe',
        instances: 45,
        avgTime: 3100,
        efficiency: 92.1
      }
    }
  })
  userBreakdown?: Record<string, {
    name: string;
    instances: number;
    avgTime: number;
    efficiency: number;
  }>;

  @ApiProperty({
    description: 'Summary statistics',
    example: {
      totalInstances: 150,
      totalExecutionTime: 540000,
      averageInstanceTime: 3600,
      dataPoints: 8
    }
  })
  summary: {
    totalInstances: number;
    totalExecutionTime: number;
    averageInstanceTime: number;
    dataPoints: number;
  };

  @ApiProperty({
    description: 'Generation timestamp',
    example: '2025-08-08T04:30:00Z'
  })
  generatedAt: string;

  @ApiPropertyOptional({
    description: 'Filters applied to this report',
    example: {
      templateIds: [ 'template-123' ],
      userIds: [ 'user-123', 'user-456' ],
      timezone: 'America/Santiago'
    }
  })
  appliedFilters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Recommendations based on the data',
    example: [
      'Consider optimizing step quality_check - it shows bottleneck characteristics',
      'Waste levels are 15% above target - review quality processes'
    ]
  })
  recommendations?: string[];
}
