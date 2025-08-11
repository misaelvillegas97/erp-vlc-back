import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for waste type breakdown
 */
export class WasteTypeBreakdownDto {
  @ApiProperty({
    description: 'Waste type',
    example: 'material_defect'
  })
  type: string;

  @ApiProperty({
    description: 'Number of records',
    example: 15
  })
  count: number;

  @ApiProperty({
    description: 'Total quantity',
    example: 75.5
  })
  quantity: number;

  @ApiProperty({
    description: 'Total value',
    example: 943.75
  })
  value: number;

  @ApiProperty({
    description: 'Percentage of total waste',
    example: 60.2
  })
  percentage: number;
}

/**
 * DTO for waste category breakdown
 */
export class WasteCategoryBreakdownDto {
  @ApiProperty({
    description: 'Waste category',
    example: 'quality_defect'
  })
  category: string;

  @ApiProperty({
    description: 'Number of records',
    example: 20
  })
  count: number;

  @ApiProperty({
    description: 'Total quantity',
    example: 100.0
  })
  quantity: number;

  @ApiProperty({
    description: 'Total value',
    example: 1250.00
  })
  value: number;

  @ApiProperty({
    description: 'Percentage of total waste',
    example: 80.0
  })
  percentage: number;
}

/**
 * DTO for waste reason breakdown
 */
export class WasteReasonBreakdownDto {
  @ApiProperty({
    description: 'Waste reason',
    example: 'Material defect detected during quality check'
  })
  reason: string;

  @ApiProperty({
    description: 'Number of records',
    example: 8
  })
  count: number;

  @ApiProperty({
    description: 'Total quantity',
    example: 40.0
  })
  quantity: number;

  @ApiProperty({
    description: 'Total value',
    example: 500.00
  })
  value: number;

  @ApiProperty({
    description: 'Percentage of total waste',
    example: 32.0
  })
  percentage: number;
}

/**
 * DTO for waste disposal method breakdown
 */
export class WasteDisposalBreakdownDto {
  @ApiProperty({
    description: 'Disposal method',
    example: 'recycling'
  })
  method: string;

  @ApiProperty({
    description: 'Number of records',
    example: 15
  })
  count: number;

  @ApiProperty({
    description: 'Total quantity',
    example: 75.0
  })
  quantity: number;

  @ApiProperty({
    description: 'Total value',
    example: 937.50
  })
  value: number;

  @ApiProperty({
    description: 'Total disposal cost',
    example: 75.00
  })
  disposalCost: number;

  @ApiProperty({
    description: 'Percentage of total waste',
    example: 60.0
  })
  percentage: number;
}

/**
 * DTO for waste trend analysis
 */
export class WasteTrendAnalysisDto {
  @ApiProperty({
    description: 'Change in quantity compared to previous period',
    example: 15.5
  })
  quantityChange: number;

  @ApiProperty({
    description: 'Percentage change in quantity',
    example: 14.1
  })
  quantityChangePercentage: number;

  @ApiProperty({
    description: 'Change in value compared to previous period',
    example: 234.50
  })
  valueChange: number;

  @ApiProperty({
    description: 'Percentage change in value',
    example: 17.6
  })
  valueChangePercentage: number;

  @ApiProperty({
    description: 'Change in record count',
    example: 3
  })
  recordCountChange: number;

  @ApiProperty({
    description: 'Percentage change in record count',
    example: 13.6
  })
  recordCountChangePercentage: number;
}

/**
 * DTO for waste contributor analysis
 */
export class WasteContributorDto {
  @ApiProperty({
    description: 'Step ID',
    example: 'step-123'
  })
  stepId: string;

  @ApiProperty({
    description: 'Step name',
    example: 'Quality Control'
  })
  stepName: string;

  @ApiProperty({
    description: 'Number of waste records',
    example: 12
  })
  count: number;

  @ApiProperty({
    description: 'Total quantity of waste',
    example: 60.0
  })
  quantity: number;

  @ApiProperty({
    description: 'Total value of waste',
    example: 750.00
  })
  value: number;

  @ApiProperty({
    description: 'Percentage of total waste',
    example: 47.8
  })
  percentage: number;
}

/**
 * DTO for waste preventability analysis
 */
export class WastePreventabilityDto {
  @ApiProperty({
    description: 'Number of preventable waste records',
    example: 18
  })
  preventableCount: number;

  @ApiProperty({
    description: 'Percentage of preventable waste records',
    example: 72.0
  })
  preventablePercentage: number;

  @ApiProperty({
    description: 'Value of preventable waste',
    example: 1125.00
  })
  preventableValue: number;

  @ApiProperty({
    description: 'Percentage of preventable waste value',
    example: 71.8
  })
  preventableValuePercentage: number;
}

/**
 * DTO for environmental impact analysis
 */
export class WasteEnvironmentalImpactDto {
  @ApiProperty({
    description: 'Number of low impact waste records',
    example: 15
  })
  lowImpact: number;

  @ApiProperty({
    description: 'Number of medium impact waste records',
    example: 8
  })
  mediumImpact: number;

  @ApiProperty({
    description: 'Number of high impact waste records',
    example: 2
  })
  highImpact: number;

  @ApiProperty({
    description: 'Total disposal cost',
    example: 175.00
  })
  totalDisposalCost: number;

  @ApiPropertyOptional({
    description: 'Estimated carbon footprint (kg CO2)',
    example: 45.2
  })
  carbonFootprint?: number;
}

/**
 * DTO for waste summary statistics
 */
export class WasteSummaryDto {
  @ApiProperty({
    description: 'Total number of waste records',
    example: 25
  })
  totalRecords: number;

  @ApiProperty({
    description: 'Total quantity of waste',
    example: 125.5
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Total value of waste',
    example: 1567.50
  })
  totalValue: number;

  @ApiProperty({
    description: 'Average waste per record',
    example: 5.02
  })
  averageWastePerRecord: number;

  @ApiProperty({
    description: 'Average value per record',
    example: 62.70
  })
  averageValuePerRecord: number;

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
    description: 'Breakdown by waste type',
    example: [
      {
        type: 'material_defect',
        count: 15,
        quantity: 75.5,
        value: 943.75,
        percentage: 60.2
      },
      {
        type: 'process_error',
        count: 10,
        quantity: 50.0,
        value: 623.75,
        percentage: 39.8
      }
    ]
  })
  byType: WasteTypeBreakdownDto[];

  @ApiProperty({
    description: 'Breakdown by category',
    example: [
      {
        category: 'quality_defect',
        count: 20,
        quantity: 100.0,
        value: 1250.00,
        percentage: 80.0
      },
      {
        category: 'operational_error',
        count: 5,
        quantity: 25.5,
        value: 317.50,
        percentage: 20.0
      }
    ]
  })
  byCategory: WasteCategoryBreakdownDto[];

  @ApiPropertyOptional({
    description: 'Breakdown by reason',
    example: [
      {
        reason: 'Material defect detected during quality check',
        count: 8,
        quantity: 40.0,
        value: 500.00,
        percentage: 32.0
      },
      {
        reason: 'Machine calibration error',
        count: 7,
        quantity: 35.5,
        value: 443.75,
        percentage: 28.4
      }
    ]
  })
  byReason?: WasteReasonBreakdownDto[];

  @ApiPropertyOptional({
    description: 'Breakdown by disposal method',
    example: [
      {
        method: 'recycling',
        count: 15,
        quantity: 75.0,
        value: 937.50,
        disposalCost: 75.00,
        percentage: 60.0
      },
      {
        method: 'landfill',
        count: 10,
        quantity: 50.5,
        value: 630.00,
        disposalCost: 100.00,
        percentage: 40.0
      }
    ]
  })
  byDisposalMethod?: WasteDisposalBreakdownDto[];

  @ApiProperty({
    description: 'Trend analysis compared to previous period',
    example: {
      quantityChange: 15.5,
      quantityChangePercentage: 14.1,
      valueChange: 234.50,
      valueChangePercentage: 17.6,
      recordCountChange: 3,
      recordCountChangePercentage: 13.6
    }
  })
  trendAnalysis: WasteTrendAnalysisDto;

  @ApiPropertyOptional({
    description: 'Top contributors to waste',
    example: [
      {
        stepId: 'step-123',
        stepName: 'Quality Control',
        count: 12,
        quantity: 60.0,
        value: 750.00,
        percentage: 47.8
      },
      {
        stepId: 'step-456',
        stepName: 'Assembly',
        count: 8,
        quantity: 40.0,
        value: 500.00,
        percentage: 31.9
      }
    ]
  })
  topContributors?: WasteContributorDto[];

  @ApiProperty({
    description: 'Preventability analysis',
    example: {
      preventableCount: 18,
      preventablePercentage: 72.0,
      preventableValue: 1125.00,
      preventableValuePercentage: 71.8
    }
  })
  preventabilityAnalysis: WastePreventabilityDto;

  @ApiProperty({
    description: 'Environmental impact summary',
    example: {
      lowImpact: 15,
      mediumImpact: 8,
      highImpact: 2,
      totalDisposalCost: 175.00,
      carbonFootprint: 45.2
    }
  })
  environmentalImpact: WasteEnvironmentalImpactDto;

  @ApiProperty({
    description: 'Timestamp when the summary was generated',
    example: '2025-08-08T12:00:00Z'
  })
  generatedAt: string;
}
