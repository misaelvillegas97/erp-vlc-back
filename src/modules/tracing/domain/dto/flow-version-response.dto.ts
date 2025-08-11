import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlowVersionStatus }                from '../enums/flow-version-status.enum';

/**
 * DTO for flow version response
 */
export class FlowVersionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the flow version',
    example: 'version-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the parent template',
    example: 'template-123'
  })
  templateId: string;

  @ApiProperty({
    description: 'Version number',
    example: 2
  })
  version: number;

  @ApiProperty({
    description: 'Status of the version',
    enum: FlowVersionStatus,
    example: FlowVersionStatus.PUBLISHED
  })
  status: FlowVersionStatus;

  @ApiPropertyOptional({
    description: 'Publication timestamp',
    example: '2025-08-08T02:13:00Z'
  })
  publishedAt?: Date;

  @ApiPropertyOptional({
    description: 'Schema hash for integrity verification',
    example: 'sha256:abc123...'
  })
  schemaHash?: string;

  @ApiPropertyOptional({
    description: 'Notes about this version',
    example: 'v2 adds chemical treatment step'
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who published the version',
    example: 'user-456'
  })
  publishedBy?: string;

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
    description: 'Number of steps in this version',
    example: 5
  })
  stepsCount?: number;

  @ApiPropertyOptional({
    description: 'Number of field categories in this version',
    example: 3
  })
  categoriesCount?: number;

  @ApiPropertyOptional({
    description: 'Number of termination rules in this version',
    example: 2
  })
  terminationRulesCount?: number;

  @ApiPropertyOptional({
    description: 'Whether this version can be edited',
    example: false
  })
  canEdit?: boolean;
}
