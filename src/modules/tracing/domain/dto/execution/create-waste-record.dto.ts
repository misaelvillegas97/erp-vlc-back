import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                         from '@nestjs/swagger';

/**
 * DTO for creating a waste record
 */
export class CreateWasteRecordDto {
  @ApiProperty({
    description: 'Step execution ID this waste record belongs to',
    example: 'step-exec-123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  stepExecutionId: string;

  @ApiProperty({
    description: 'Quantity of waste',
    example: 5.5,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty({
    description: 'Reason for the waste',
    example: 'Material defect detected during quality check'
  })
  @IsString()
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
    description: 'URL to evidence (photo, document, etc.)',
    example: 'https://storage.example.com/evidence/waste-photo-123.jpg'
  })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @ApiPropertyOptional({
    description: 'Cost impact of the waste',
    example: 25.50,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costImpact?: number;

  @ApiPropertyOptional({
    description: 'SKU of the wasted item',
    example: 'SKU-12345'
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Lot number of the wasted item',
    example: 'LOT-2025-001'
  })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Found during final inspection, entire batch affected'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the waste record',
    example: {
      inspector: 'John Doe',
      station: 'QC-Station-A',
      batchNumber: 'BATCH-2025-001',
      temperature: 22.5,
      humidity: 45
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'User ID who recorded the waste',
    example: 'user-123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  recordedBy: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the waste was recorded (ISO string)',
    example: '2025-08-08T10:30:00Z'
  })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}
