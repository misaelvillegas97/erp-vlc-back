import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                           from '@nestjs/swagger';

/**
 * DTO for report export request
 */
export class ReportExportRequestDto {
  @ApiProperty({
    description: 'Export format',
    enum: [ 'csv', 'pdf', 'excel', 'json' ],
    example: 'csv'
  })
  @IsEnum([ 'csv', 'pdf', 'excel', 'json' ])
  format: 'csv' | 'pdf' | 'excel' | 'json';

  @ApiProperty({
    description: 'Type of report to export',
    enum: [ 'kpi', 'bottlenecks', 'waste_analysis', 'efficiency', 'custom' ],
    example: 'kpi'
  })
  @IsEnum([ 'kpi', 'bottlenecks', 'waste_analysis', 'efficiency', 'custom' ])
  reportType: 'kpi' | 'bottlenecks' | 'waste_analysis' | 'efficiency' | 'custom';

  @ApiPropertyOptional({
    description: 'Report title for the export',
    example: 'Weekly KPI Report - Quality Control'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Report description',
    example: 'Performance metrics for quality control processes from Aug 1-8, 2025'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Sections to include in the export',
    example: [ 'summary', 'metrics', 'charts', 'recommendations' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  sections?: string[];

  @ApiPropertyOptional({
    description: 'Chart types to include (for PDF/Excel)',
    example: [ 'line', 'bar', 'pie' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  chartTypes?: string[];

  @ApiPropertyOptional({
    description: 'Include raw data tables',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  includeRawData?: boolean;

  @ApiPropertyOptional({
    description: 'Include executive summary',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  includeExecutiveSummary?: boolean;

  @ApiPropertyOptional({
    description: 'Include detailed breakdowns',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  includeDetailedBreakdowns?: boolean;

  @ApiPropertyOptional({
    description: 'Custom styling options',
    example: {
      theme: 'corporate',
      primaryColor: '#1f2937',
      logo: 'https://company.com/logo.png'
    }
  })
  @IsOptional()
  @IsObject()
  styling?: {
    theme?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    headerText?: string;
    footerText?: string;
  };

  @ApiPropertyOptional({
    description: 'Language for the export',
    example: 'es',
    default: 'en'
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Timezone for date formatting',
    example: 'America/Santiago',
    default: 'UTC'
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata to include',
    example: {
      generatedBy: 'user-123',
      department: 'Quality Control',
      confidentiality: 'Internal Use Only'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for report export response
 */
export class ReportExportResponseDto {
  @ApiProperty({
    description: 'Export job ID for tracking',
    example: 'export-job-123'
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status of the export',
    enum: [ 'pending', 'processing', 'completed', 'failed' ],
    example: 'processing'
  })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Download URL when export is completed',
    example: 'https://storage.example.com/exports/report-123.csv'
  })
  downloadUrl?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 2048576
  })
  fileSizeBytes?: number;

  @ApiPropertyOptional({
    description: 'Estimated completion time',
    example: '2025-08-08T04:35:00Z'
  })
  estimatedCompletionTime?: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 75
  })
  progressPercentage?: number;

  @ApiPropertyOptional({
    description: 'Error message if export failed',
    example: 'Insufficient data for the requested period'
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Export creation timestamp',
    example: '2025-08-08T04:30:00Z'
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Export completion timestamp',
    example: '2025-08-08T04:32:00Z'
  })
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Export expiration timestamp',
    example: '2025-08-15T04:30:00Z'
  })
  expiresAt?: string;

  @ApiProperty({
    description: 'Export format',
    enum: [ 'csv', 'pdf', 'excel', 'json' ],
    example: 'csv'
  })
  format: 'csv' | 'pdf' | 'excel' | 'json';

  @ApiPropertyOptional({
    description: 'Export statistics',
    example: {
      recordsProcessed: 1500,
      chartsGenerated: 5,
      pagesGenerated: 12
    }
  })
  statistics?: {
    recordsProcessed?: number;
    chartsGenerated?: number;
    pagesGenerated?: number;
    processingTimeSeconds?: number;
  };

  @ApiPropertyOptional({
    description: 'Export metadata',
    example: {
      filename: 'kpi-report-2025-08-08.csv',
      contentType: 'text/csv',
      encoding: 'utf-8'
    }
  })
  exportMetadata?: {
    filename?: string;
    contentType?: string;
    encoding?: string;
    compression?: string;
  };
}

/**
 * DTO for bottleneck analysis
 */
export class BottleneckAnalysisDto {
  @ApiProperty({
    description: 'Analysis period start',
    example: '2025-08-01T00:00:00Z'
  })
  periodStart: string;

  @ApiProperty({
    description: 'Analysis period end',
    example: '2025-08-08T23:59:59Z'
  })
  periodEnd: string;

  @ApiProperty({
    description: 'Top bottleneck steps',
    example: [
      {
        stepId: 'step-123',
        stepKey: 'quality_check',
        stepName: 'Quality Control Check',
        bottleneckScore: 8.5,
        averageWaitTime: 1800,
        throughputImpact: 25.5,
        frequency: 150,
        recommendations: [ 'Add parallel processing', 'Optimize validation rules' ]
      }
    ]
  })
  topBottlenecks: Array<{
    stepId: string;
    stepKey: string;
    stepName: string;
    bottleneckScore: number;
    averageWaitTime: number;
    throughputImpact: number;
    frequency: number;
    recommendations: string[];
  }>;

  @ApiProperty({
    description: 'Overall bottleneck metrics',
    example: {
      totalBottlenecks: 5,
      averageBottleneckScore: 6.2,
      totalThroughputImpact: 45.8,
      mostProblematicTemplate: 'template-123'
    }
  })
  overallMetrics: {
    totalBottlenecks: number;
    averageBottleneckScore: number;
    totalThroughputImpact: number;
    mostProblematicTemplate: string;
  };

  @ApiPropertyOptional({
    description: 'Bottleneck trends over time',
    example: [
      {date: '2025-08-01', bottleneckCount: 3, avgScore: 5.5},
      {date: '2025-08-02', bottleneckCount: 4, avgScore: 6.2}
    ]
  })
  trends?: Array<{
    date: string;
    bottleneckCount: number;
    avgScore: number;
  }>;

  @ApiPropertyOptional({
    description: 'Bottleneck breakdown by template',
    example: {
      'template-123': {
        name: 'Quality Control',
        bottleneckCount: 3,
        avgScore: 7.2,
        impact: 35.5
      }
    }
  })
  byTemplate?: Record<string, {
    name: string;
    bottleneckCount: number;
    avgScore: number;
    impact: number;
  }>;

  @ApiProperty({
    description: 'Analysis generation timestamp',
    example: '2025-08-08T04:30:00Z'
  })
  generatedAt: string;

  @ApiPropertyOptional({
    description: 'Overall recommendations',
    example: [
      'Focus optimization efforts on quality_check step',
      'Consider load balancing for high-frequency templates',
      'Review resource allocation during peak hours'
    ]
  })
  recommendations?: string[];
}
