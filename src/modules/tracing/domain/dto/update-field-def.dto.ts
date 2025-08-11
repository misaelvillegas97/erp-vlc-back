import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional }                                           from '@nestjs/swagger';
import { FieldType }                                                     from '../enums/field-type.enum';

/**
 * DTO for updating a field definition
 */
export class UpdateFieldDefDto {
  @ApiPropertyOptional({
    description: 'ID of the category this field belongs to',
    example: 'category-123'
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Unique key for the field within the step',
    example: 'product_sku'
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Display label for the field',
    example: 'Product SKU'
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Type of the field',
    enum: FieldType,
    example: FieldType.TEXT
  })
  @IsOptional()
  @IsEnum(FieldType)
  type?: FieldType;

  @ApiPropertyOptional({
    description: 'Whether the field is required',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the field (validation rules, options, etc.)',
    example: {
      minLength: 3,
      maxLength: 50,
      pattern: '^[A-Z0-9-]+$',
      options: [ 'Option 1', 'Option 2' ]
    }
  })
  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Order of the field within the step/category',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Description/help text for the field',
    example: 'Enter the unique product identifier'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Placeholder text for the field',
    example: 'e.g., PROD-12345'
  })
  @IsOptional()
  @IsString()
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
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the field is active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
