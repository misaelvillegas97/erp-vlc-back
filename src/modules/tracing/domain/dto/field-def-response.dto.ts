import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType }                        from '../enums/field-type.enum';

/**
 * DTO for field definition response
 */
export class FieldDefResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the field definition',
    example: 'field-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the step this field belongs to',
    example: 'step-123'
  })
  stepId: string;

  @ApiPropertyOptional({
    description: 'ID of the category this field belongs to',
    example: 'category-123'
  })
  categoryId?: string;

  @ApiProperty({
    description: 'Unique key for the field within the step',
    example: 'product_sku'
  })
  key: string;

  @ApiProperty({
    description: 'Display label for the field',
    example: 'Product SKU'
  })
  label: string;

  @ApiProperty({
    description: 'Type of the field',
    enum: FieldType,
    example: FieldType.TEXT
  })
  type: FieldType;

  @ApiProperty({
    description: 'Whether the field is required',
    example: true
  })
  required: boolean;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the field (validation rules, options, etc.)',
    example: {
      minLength: 3,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      options: [ 'Option 1', 'Option 2' ]
    }
  })
  configJson?: Record<string, any>;

  @ApiProperty({
    description: 'Order of the field within the step/category',
    example: 1
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Description/help text for the field',
    example: 'Enter the unique product identifier'
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Placeholder text for the field',
    example: 'e.g., PROD-12345'
  })
  placeholder?: string;

  @ApiPropertyOptional({
    description: 'Validation rules for the field',
    example: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$'
    }
  })
  validationRules?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the field is active',
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
    description: 'Category name if field belongs to a category',
    example: 'Product Information'
  })
  categoryName?: string;

  @ApiPropertyOptional({
    description: 'Whether this field can be edited (version is DRAFT)',
    example: true
  })
  canEdit?: boolean;

  @ApiPropertyOptional({
    description: 'Number of values recorded for this field',
    example: 25
  })
  valuesCount?: number;
}
