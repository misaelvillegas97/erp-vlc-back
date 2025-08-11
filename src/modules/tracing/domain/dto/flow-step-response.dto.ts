import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepType }                         from '../enums/step-type.enum';

/**
 * DTO for flow step response
 */
export class FlowStepResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the flow step',
    example: 'step-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the flow version this step belongs to',
    example: 'version-123'
  })
  flowVersionId: string;

  @ApiProperty({
    description: 'Unique key for the step within the flow',
    example: 'quality_check'
  })
  key: string;

  @ApiProperty({
    description: 'Display name of the step',
    example: 'Quality Control Check'
  })
  name: string;

  @ApiProperty({
    description: 'Type of the step',
    enum: StepType,
    example: StepType.STANDARD
  })
  type: StepType;

  @ApiPropertyOptional({
    description: 'Position of the step in the canvas',
    example: {x: 100, y: 200}
  })
  position?: { x: number; y: number };

  @ApiProperty({
    description: 'Order of the step in the flow',
    example: 1
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Description of the step',
    example: 'Perform quality control checks on the product'
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the step',
    example: {timeout: 3600, requiresApproval: true}
  })
  configJson?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the step is active',
    example: true
  })
  isActive: boolean;

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

  @ApiPropertyOptional({
    description: 'Number of fields defined for this step',
    example: 5
  })
  fieldsCount?: number;

  @ApiPropertyOptional({
    description: 'Whether this step can be edited (version is DRAFT)',
    example: true
  })
  canEdit?: boolean;

  @ApiPropertyOptional({
    description: 'Number of executions for this step',
    example: 12
  })
  executionsCount?: number;
}
