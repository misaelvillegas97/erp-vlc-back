import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlowInstanceStatus }               from '../../enums/execution-status.enum';

/**
 * DTO for flow instance response
 */
export class FlowInstanceResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the flow instance',
    example: 'instance-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the template being executed',
    example: 'template-123'
  })
  templateId: string;

  @ApiProperty({
    description: 'Version number being executed',
    example: 2
  })
  version: number;

  @ApiProperty({
    description: 'Current status of the flow instance',
    enum: FlowInstanceStatus,
    example: FlowInstanceStatus.ACTIVE
  })
  status: FlowInstanceStatus;

  @ApiProperty({
    description: 'ID of the user who started the flow',
    example: 'user-123'
  })
  startedBy: string;

  @ApiProperty({
    description: 'When the flow was started',
    example: '2025-08-08T02:13:00Z'
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'When the flow was finished',
    example: '2025-08-08T04:30:00Z'
  })
  finishedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the user who finished the flow',
    example: 'user-456'
  })
  finishedBy?: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation if flow was cancelled',
    example: 'Excessive waste detected - automatic cancellation'
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Context data for the flow execution',
    example: {
      orderId: 'order-456',
      productSku: 'PROD-789',
      batchId: 'BATCH-2025-001'
    }
  })
  contextData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the instance',
    example: {
      priority: 'high',
      department: 'quality-control',
      shift: 'morning'
    }
  })
  metadata?: Record<string, any>;

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
    description: 'Template name for display purposes',
    example: 'Production Quality Control'
  })
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Total number of steps in this flow',
    example: 5
  })
  totalSteps?: number;

  @ApiPropertyOptional({
    description: 'Number of completed steps',
    example: 3
  })
  completedSteps?: number;

  @ApiPropertyOptional({
    description: 'Number of pending steps',
    example: 2
  })
  pendingSteps?: number;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 60
  })
  progressPercentage?: number;

  @ApiPropertyOptional({
    description: 'Current step being executed',
    example: {
      id: 'step-456',
      key: 'quality_check',
      name: 'Quality Control Check'
    }
  })
  currentStep?: {
    id: string;
    key: string;
    name: string;
  };

  @ApiPropertyOptional({
    description: 'Total execution time in seconds',
    example: 7200
  })
  executionTimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Whether this instance can be cancelled',
    example: true
  })
  canCancel?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this instance can be resumed',
    example: false
  })
  canResume?: boolean;
}
