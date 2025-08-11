import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional }                                   from '@nestjs/swagger';

/**
 * DTO for updating a field category
 */
export class UpdateFieldCategoryDto {
  @ApiPropertyOptional({
    description: 'Name of the field category',
    example: 'Product Information'
  })
  @IsOptional()
  @IsString()
  name?: string;

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
    example: true
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
