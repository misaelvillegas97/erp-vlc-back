import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                                              from '@nestjs/swagger';
import { Type }                                                                                          from 'class-transformer';

/**
 * DTO for field value in step completion
 */
export class FieldValueDto {
  @ApiProperty({
    description: 'Key of the field',
    example: 'product_sku'
  })
  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @ApiProperty({
    description: 'Value of the field',
    example: 'PROD-12345'
  })
  value: any;

  @ApiPropertyOptional({
    description: 'Raw string value if different from processed value',
    example: 'PROD-12345'
  })
  @IsOptional()
  @IsString()
  rawValue?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the field value',
    example: {source: 'barcode_scan', confidence: 0.95}
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for waste record in step completion
 */
export class WasteRecordDto {
  @ApiProperty({
    description: 'Quantity of waste',
    example: 12.5,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty({
    description: 'Reason for the waste',
    example: 'Product damaged during handling'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether this waste affects inventory',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  affectsInventory?: boolean;

  @ApiPropertyOptional({
    description: 'URL to evidence file (photo, document)',
    example: 'https://storage.example.com/evidence/waste-123.jpg'
  })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @ApiPropertyOptional({
    description: 'Cost impact of the waste',
    example: 45.75
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costImpact?: number;

  @ApiPropertyOptional({
    description: 'Product SKU affected by waste',
    example: 'PROD-12345'
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Lot number affected by waste',
    example: 'LOT-2025-001'
  })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Found during quality inspection'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the waste record',
    example: {inspector: 'user-789', severity: 'high'}
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for order link in step completion
 */
export class OrderLinkDto {
  @ApiPropertyOptional({
    description: 'ID of existing order to link',
    example: 'order-456'
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({
    description: 'Mode of order association',
    enum: [ 'LINKED', 'CREATED' ],
    example: 'LINKED'
  })
  @IsString()
  @IsNotEmpty()
  mode: 'LINKED' | 'CREATED';

  @ApiPropertyOptional({
    description: 'Metadata for the order link',
    example: {
      orderType: 'RESTOCK',
      priority: 'high',
      requestedBy: 'user-123'
    }
  })
  @IsOptional()
  @IsObject()
  linkMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional notes about the order link',
    example: 'Created due to excessive waste in quality control'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for completing a step execution
 */
export class CompleteStepDto {
  @ApiProperty({
    description: 'ID of the user completing the step',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  actorId: string;

  @ApiPropertyOptional({
    description: 'Field values entered for this step',
    type: [ FieldValueDto ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => FieldValueDto)
  fieldValues?: FieldValueDto[];

  @ApiPropertyOptional({
    description: 'Waste records for this step',
    type: [ WasteRecordDto ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => WasteRecordDto)
  wastes?: WasteRecordDto[];

  @ApiPropertyOptional({
    description: 'Order links for this step',
    type: [ OrderLinkDto ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => OrderLinkDto)
  links?: OrderLinkDto[];

  @ApiPropertyOptional({
    description: 'Completion notes',
    example: 'All quality checks passed successfully'
  })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional({
    description: 'Additional execution data',
    example: {
      duration: 1800,
      tools_used: [ 'scanner', 'scale' ],
      temperature: 22.5
    }
  })
  @IsOptional()
  @IsObject()
  executionData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to force completion despite validation errors',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  forceComplete?: boolean;
}
