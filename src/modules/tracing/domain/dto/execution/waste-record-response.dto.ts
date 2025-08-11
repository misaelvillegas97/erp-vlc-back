import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for waste record response
 */
export class WasteRecordResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the waste record',
    example: 'waste-123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Step execution ID this waste record belongs to',
    example: 'step-exec-123e4567-e89b-12d3-a456-426614174000'
  })
  stepExecutionId: string;

  @ApiProperty({
    description: 'Type of waste',
    example: 'material_defect'
  })
  wasteType: string;

  @ApiProperty({
    description: 'Quantity of waste',
    example: 5
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'kg'
  })
  unit: string;

  @ApiProperty({
    description: 'Unit value of the waste',
    example: 12.50
  })
  unitValue: number;

  @ApiProperty({
    description: 'Total value of the waste (quantity * unitValue)',
    example: 62.50
  })
  totalValue: number;

  @ApiPropertyOptional({
    description: 'Reason for the waste',
    example: 'Material defect detected during quality check'
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Category of the waste',
    example: 'quality_defect'
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the waste',
    example: 'Defect found in batch #12345, needs to be discarded'
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'User who recorded the waste',
    example: 'user-123e4567-e89b-12d3-a456-426614174000'
  })
  recordedBy?: string;

  @ApiPropertyOptional({
    description: 'User name who recorded the waste',
    example: 'John Doe'
  })
  recordedByName?: string;

  @ApiProperty({
    description: 'Timestamp when the waste was recorded',
    example: '2025-08-08T10:30:00Z'
  })
  recordedAt: string;

  @ApiProperty({
    description: 'Timestamp when the record was created',
    example: '2025-08-08T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the record was last updated',
    example: '2025-08-08T10:35:00Z'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Name of the step where waste was recorded',
    example: 'Quality Control'
  })
  stepName?: string;

  @ApiPropertyOptional({
    description: 'Flow instance ID this waste record belongs to',
    example: 'instance-123e4567-e89b-12d3-a456-426614174000'
  })
  instanceId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the waste record',
    example: {
      batchNumber: '12345',
      location: 'Station A',
      inspector: 'Jane Smith'
    }
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Status of the waste record',
    example: 'confirmed',
    enum: [ 'pending', 'confirmed', 'disputed', 'resolved' ]
  })
  status?: 'pending' | 'confirmed' | 'disputed' | 'resolved';

  @ApiPropertyOptional({
    description: 'Disposal method for the waste',
    example: 'recycling'
  })
  disposalMethod?: string;

  @ApiPropertyOptional({
    description: 'Cost associated with the waste disposal',
    example: 5.00
  })
  disposalCost?: number;

  @ApiPropertyOptional({
    description: 'Environmental impact category',
    example: 'low'
  })
  environmentalImpact?: string;

  @ApiPropertyOptional({
    description: 'Whether this waste can be prevented in future',
    example: true
  })
  preventable?: boolean;

  @ApiPropertyOptional({
    description: 'Corrective actions taken or recommended',
    example: [ 'Adjust machine calibration', 'Retrain operator' ]
  })
  correctiveActions?: string[];
}
