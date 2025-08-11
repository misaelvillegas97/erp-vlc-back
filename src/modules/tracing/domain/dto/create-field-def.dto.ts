import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                          from '@nestjs/swagger';
import { FieldType }                                                                 from '../enums/field-type.enum';

/**
 * DTO for creating a new field definition
 */
export class CreateFieldDefDto {
  @ApiProperty({
    description: 'ID of the step this field belongs to',
    example: 'step-123'
  })
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @ApiPropertyOptional({
    description: 'ID of the category this field belongs to',
    example: 'category-123'
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Unique key for the field within the step',
    example: 'product_sku'
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Display label for the field',
    example: 'Product SKU'
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    description: 'Type of the field',
    enum: FieldType,
    example: FieldType.TEXT
  })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiPropertyOptional({
    description: 'Whether the field is required',
    example: true,
    default: false
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
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
