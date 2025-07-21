import { ApiPropertyOptional, PartialType }                      from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  Validate
}                                                                from 'class-validator';
import { CreateChecklistGroupDto, TemplateWeightsSumConstraint } from './create-checklist-group.dto';

export class UpdateChecklistGroupDto extends PartialType(CreateChecklistGroupDto) {
  @ApiPropertyOptional({
    description: 'Name of the checklist group',
    example: 'Updated Vehicle Safety Inspection Group'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the checklist group',
    example: 'Updated comprehensive safety inspection combining multiple checklist templates'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Weight of the group in overall scoring',
    example: 1.0,
    minimum: 0,
    maximum: 1
  })
  @IsNumber({maxDecimalPlaces: 4})
  @Min(0)
  @Max(1)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Vehicle types this group applies to',
    type: [ String ],
    example: [ 'TRUCK', 'VAN', 'SEDAN', 'MOTORCYCLE' ]
  })
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  vehicleTypes?: string[];

  @ApiPropertyOptional({
    description: 'User roles that can execute this group',
    type: [ String ],
    example: [ 'driver', 'supervisor', 'mechanic', 'inspector' ]
  })
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  userRoles?: string[];

  @ApiPropertyOptional({
    description: 'Whether the group is active',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Performance threshold percentage for incident creation',
    example: 75.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(100)
  @IsOptional()
  performanceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Array of template IDs to include in this group',
    type: [ String ],
    example: [ '123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d1-9f4e-123456789abc', 'abc12345-6789-0def-1234-567890abcdef' ]
  })
  @IsArray()
  @IsUUID(4, {each: true})
  @IsOptional()
  templateIds?: string[];

  @ApiPropertyOptional({
    description: 'Weight distribution for templates in the group. Keys are template IDs, values are weights (0-1) that must sum to 1.0',
    example: {
      '123e4567-e89b-12d3-a456-426614174000': 0.4,
      '987fcdeb-51a2-43d1-9f4e-123456789abc': 0.3,
      'abc12345-6789-0def-1234-567890abcdef': 0.3
    }
  })
  @IsObject()
  @IsOptional()
  @Validate(TemplateWeightsSumConstraint)
  templateWeights?: Record<string, number>;
}
