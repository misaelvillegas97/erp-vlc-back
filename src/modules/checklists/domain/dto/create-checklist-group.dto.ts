import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface
}                                           from 'class-validator';

@ValidatorConstraint({name: 'templateWeightsSum', async: false})
export class TemplateWeightsSumConstraint implements ValidatorConstraintInterface {
  validate(templateWeights: Record<string, number>) {
    if (!templateWeights || typeof templateWeights !== 'object') {
      return false;
    }

    const weights = Object.values(templateWeights);
    if (weights.length === 0) {
      return false;
    }

    // Check if all weights are between 0 and 1
    const validWeights = weights.every(weight =>
      typeof weight === 'number' && weight >= 0 && weight <= 1
    );

    if (!validWeights) {
      return false;
    }

    // Check if weights sum to 1 (with small tolerance for floating point precision)
    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    return Math.abs(sum - 1) < 0.0001;
  }

  defaultMessage() {
    return 'Template weights must sum to 1.0 and each weight must be between 0 and 1';
  }
}

export class CreateChecklistGroupDto {
  @ApiProperty({
    description: 'Name of the checklist group',
    example: 'Vehicle Safety Inspection Group'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the checklist group',
    example: 'Comprehensive safety inspection combining multiple checklist templates'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Weight of the group in overall scoring',
    example: 1.0,
    minimum: 0,
    maximum: 1,
    default: 1.0
  })
  @IsNumber({maxDecimalPlaces: 4})
  @Min(0)
  @Max(1)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Vehicle types this group applies to',
    type: [ String ],
    example: [ 'TRUCK', 'VAN', 'SEDAN' ]
  })
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  vehicleTypes?: string[];

  @ApiPropertyOptional({
    description: 'User roles that can execute this group',
    type: [ String ],
    example: [ 'driver', 'supervisor', 'mechanic' ]
  })
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  userRoles?: string[];

  @ApiPropertyOptional({
    description: 'Whether the group is active',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Performance threshold percentage for incident creation',
    example: 70.0,
    minimum: 0,
    maximum: 100,
    default: 70.0
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(100)
  @IsOptional()
  performanceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Array of template IDs to include in this group',
    type: [ String ],
    example: [ '123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d1-9f4e-123456789abc' ]
  })
  @IsArray()
  @IsUUID(4, {each: true})
  @IsOptional()
  templateIds?: string[];

  @ApiPropertyOptional({
    description: 'Weight distribution for templates in the group. Keys are template IDs, values are weights (0-1) that must sum to 1.0',
    example: {
      '123e4567-e89b-12d3-a456-426614174000': 0.6,
      '987fcdeb-51a2-43d1-9f4e-123456789abc': 0.4
    }
  })
  @IsObject()
  @IsOptional()
  @Validate(TemplateWeightsSumConstraint)
  templateWeights?: Record<string, number>;
}
