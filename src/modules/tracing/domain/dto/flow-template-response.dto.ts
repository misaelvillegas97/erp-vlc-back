import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for flow template response
 */
export class FlowTemplateResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the flow template',
    example: 'template-123'
  })
  id: string;

  @ApiProperty({
    description: 'Name of the flow template',
    example: 'Production Quality Control'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the flow template',
    example: 'Quality control process for production line items'
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the template is active',
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
    description: 'Number of versions for this template',
    example: 3
  })
  versionsCount?: number;

  @ApiPropertyOptional({
    description: 'Number of active instances for this template',
    example: 5
  })
  activeInstancesCount?: number;

  @ApiPropertyOptional({
    description: 'Latest published version number',
    example: 2
  })
  latestPublishedVersion?: number;
}
