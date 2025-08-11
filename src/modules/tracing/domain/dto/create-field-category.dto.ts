import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                  from '@nestjs/swagger';

/**
 * DTO for creating a new field category
 */
export class CreateFieldCategoryDto {
  @ApiProperty({
    description: 'ID of the flow version this category belongs to',
    example: 'version-123'
  })
  @IsString()
  @IsNotEmpty()
  flowVersionId: string;

  @ApiProperty({
    description: 'Name of the field category',
    example: 'Product Information'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Order of the category in the form',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Fields related to product identification and specifications'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the category',
    example: {collapsible: true, expanded: false}
  })
  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;
}
