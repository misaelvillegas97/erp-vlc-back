import { ApiProperty, ApiPropertyOptional }            from '@nestjs/swagger';
import { StepExecutionStatus }                         from '../../enums/execution-status.enum';
import { FieldValueDto, OrderLinkDto, WasteRecordDto } from './complete-step.dto';

/**
 * DTO for step execution response
 */
export class StepExecutionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the step execution',
    example: 'execution-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the flow instance this execution belongs to',
    example: 'instance-123'
  })
  instanceId: string;

  @ApiProperty({
    description: 'ID of the step being executed',
    example: 'step-456'
  })
  stepId: string;

  @ApiProperty({
    description: 'Current status of the step execution',
    enum: StepExecutionStatus,
    example: StepExecutionStatus.DONE
  })
  status: StepExecutionStatus;

  @ApiPropertyOptional({
    description: 'When the step execution was started',
    example: '2025-08-08T02:13:00Z'
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'When the step execution was finished',
    example: '2025-08-08T02:45:00Z'
  })
  finishedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the user who executed this step',
    example: 'user-123'
  })
  actorId?: string;

  @ApiPropertyOptional({
    description: 'Completion notes for this step',
    example: 'All quality checks passed successfully'
  })
  completionNotes?: string;

  @ApiPropertyOptional({
    description: 'Additional execution data',
    example: {
      duration: 1800,
      tools_used: [ 'scanner', 'scale' ],
      temperature: 22.5
    }
  })
  executionData?: Record<string, any>;

  @ApiProperty({
    description: 'Whether this step execution has errors',
    example: false
  })
  hasErrors: boolean;

  @ApiPropertyOptional({
    description: 'Error details if any',
    example: {
      validationErrors: [ 'Field product_sku is required' ],
      systemErrors: []
    }
  })
  errorDetails?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-08T02:13:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-08-08T02:13:00Z'
  })
  updatedAt: Date;

  // Step information
  @ApiPropertyOptional({
    description: 'Step key for reference',
    example: 'quality_check'
  })
  stepKey?: string;

  @ApiPropertyOptional({
    description: 'Step name for display',
    example: 'Quality Control Check'
  })
  stepName?: string;

  @ApiPropertyOptional({
    description: 'Step order in the flow',
    example: 3
  })
  stepOrder?: number;

  // Field values
  @ApiPropertyOptional({
    description: 'Field values entered for this step',
    type: [ FieldValueDto ]
  })
  fieldValues?: FieldValueDto[];

  // Waste records
  @ApiPropertyOptional({
    description: 'Waste records for this step',
    type: [ WasteRecordDto ]
  })
  wasteRecords?: WasteRecordDto[];

  // Order links
  @ApiPropertyOptional({
    description: 'Order links for this step',
    type: [ OrderLinkDto ]
  })
  orderLinks?: OrderLinkDto[];

  // Computed fields
  @ApiPropertyOptional({
    description: 'Execution time in seconds',
    example: 1920
  })
  executionTimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Number of field values entered',
    example: 5
  })
  fieldValuesCount?: number;

  @ApiPropertyOptional({
    description: 'Number of waste records',
    example: 2
  })
  wasteRecordsCount?: number;

  @ApiPropertyOptional({
    description: 'Total waste quantity',
    example: 15.5
  })
  totalWasteQty?: number;

  @ApiPropertyOptional({
    description: 'Number of order links',
    example: 1
  })
  orderLinksCount?: number;

  @ApiPropertyOptional({
    description: 'Whether this step can be restarted',
    example: false
  })
  canRestart?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this step can be skipped',
    example: true
  })
  canSkip?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this step is the current active step',
    example: true
  })
  isCurrentStep?: boolean;

  @ApiPropertyOptional({
    description: 'Next possible steps after this one',
    example: [
      {
        id: 'step-789',
        key: 'packaging',
        name: 'Packaging'
      }
    ]
  })
  nextSteps?: Array<{
    id: string;
    key: string;
    name: string;
  }>;

  @ApiPropertyOptional({
    description: 'Actor name for display purposes',
    example: 'John Doe'
  })
  actorName?: string;

  @ApiPropertyOptional({
    description: 'Validation status of field values',
    example: {
      valid: true,
      errors: [],
      warnings: [ 'Field product_weight is recommended' ]
    }
  })
  validationStatus?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}
