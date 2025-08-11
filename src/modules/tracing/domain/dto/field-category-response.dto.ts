import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for field category response
 */
export class FieldCategoryResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the field category',
    example: 'category-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the flow version this category belongs to',
    example: 'version-123'
  })
  flowVersionId: string;

  @ApiProperty({
    description: 'Name of the field category',
    example: 'Product Information'
  })
  name: string;

  @ApiProperty({
    description: 'Order of the category in the form',
    example: 1
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Fields related to product identification and specifications'
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the category is active',
    example: true
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the category',
    example: {collapsible: true, expanded: false}
  })
  configJson?: Record<string, any>;

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
    description: 'Number of fields in this category',
    example: 5
  })
  fieldsCount?: number;

  @ApiPropertyOptional({
    description: 'Whether this category can be edited (version is DRAFT)',
    example: true
  })
  canEdit?: boolean;
}
