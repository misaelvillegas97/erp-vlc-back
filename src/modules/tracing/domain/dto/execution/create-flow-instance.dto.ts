import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                       from '@nestjs/swagger';

/**
 * DTO for creating a new flow instance
 */
export class CreateFlowInstanceDto {
  @ApiProperty({
    description: 'ID of the template to execute',
    example: 'template-123'
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Version number to execute',
    example: 2,
    minimum: 1
  })
  @IsInt()
  @Min(1)
  version: number;

  @ApiProperty({
    description: 'ID of the user starting the flow',
    example: 'user-123'
  })
  @IsString()
  @IsNotEmpty()
  startedBy: string;

  @ApiPropertyOptional({
    description: 'Initial context data for the flow execution',
    example: {
      orderId: 'order-456',
      productSku: 'PROD-789',
      batchId: 'BATCH-2025-001'
    }
  })
  @IsOptional()
  @IsObject()
  contextData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the instance',
    example: {
      priority: 'high',
      department: 'quality-control',
      shift: 'morning'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
