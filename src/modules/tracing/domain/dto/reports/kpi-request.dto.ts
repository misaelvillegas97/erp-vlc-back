import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                     from '@nestjs/swagger';

/**
 * DTO for KPI request parameters
 */
export class KpiRequestDto {
  @ApiProperty({
    description: 'Start date for the KPI period (ISO string)',
    example: '2025-08-01T00:00:00Z'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the KPI period (ISO string)',
    example: '2025-08-08T23:59:59Z'
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Template IDs to filter by',
    example: [ 'template-123', 'template-456' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  templateIds?: string[];

  @ApiPropertyOptional({
    description: 'Version numbers to filter by',
    example: [ 1, 2, 3 ]
  })
  @IsOptional()
  @IsArray()
  @IsInt({each: true})
  @Min(1, {each: true})
  versions?: number[];

  @ApiPropertyOptional({
    description: 'User IDs to filter by',
    example: [ 'user-123', 'user-456' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  userIds?: string[];

  @ApiProperty({
    description: 'Grouping period for the KPIs',
    enum: [ 'day', 'week', 'month' ],
    example: 'day'
  })
  @IsEnum([ 'day', 'week', 'month' ])
  groupBy: 'day' | 'week' | 'month';

  @ApiPropertyOptional({
    description: 'Specific KPI metrics to include',
    example: [ 'instances_processed', 'avg_execution_time', 'waste_total', 'efficiency_rate' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Include detailed breakdown by template',
    example: true,
    default: false
  })
  @IsOptional()
  includeTemplateBreakdown?: boolean;

  @ApiPropertyOptional({
    description: 'Include detailed breakdown by user',
    example: false,
    default: false
  })
  @IsOptional()
  includeUserBreakdown?: boolean;

  @ApiPropertyOptional({
    description: 'Include step-level metrics',
    example: true,
    default: false
  })
  @IsOptional()
  includeStepMetrics?: boolean;

  @ApiPropertyOptional({
    description: 'Include waste analysis',
    example: true,
    default: true
  })
  @IsOptional()
  includeWasteAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Include efficiency calculations',
    example: true,
    default: true
  })
  @IsOptional()
  includeEfficiencyMetrics?: boolean;

  @ApiPropertyOptional({
    description: 'Timezone for date calculations',
    example: 'America/Santiago',
    default: 'UTC'
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Minimum confidence level for statistical metrics (0-100)',
    example: 95,
    minimum: 50,
    maximum: 99
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(99)
  confidenceLevel?: number;

  @ApiPropertyOptional({
    description: 'Include comparison with previous period',
    example: true,
    default: false
  })
  @IsOptional()
  includePreviousPeriodComparison?: boolean;

  @ApiPropertyOptional({
    description: 'Include trend analysis',
    example: true,
    default: false
  })
  @IsOptional()
  includeTrendAnalysis?: boolean;
}
