import { ApiProperty, ApiPropertyOptional }                                          from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Title of the question',
    example: 'Are all lights functioning properly?'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the question',
    example: 'Check all vehicle lights including headlights, taillights, and indicators'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Weight of the question in scoring (minimum 0.1)',
    example: 1.0,
    minimum: 0.1
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0.1)
  @IsNotEmpty()
  weight: number;

  @ApiProperty({
    description: 'Whether this question is required to be answered',
    example: true
  })
  @IsBoolean()
  @IsNotEmpty()
  required: boolean;

  @ApiProperty({
    description: 'Whether this question supports intermediate approval status',
    example: false
  })
  @IsBoolean()
  @IsNotEmpty()
  hasIntermediateApproval: boolean;

  @ApiProperty({
    description: 'Value assigned to intermediate approval (0-1)',
    example: 0.5,
    minimum: 0,
    maximum: 1
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(1)
  @IsNotEmpty()
  intermediateValue: number;

  @ApiPropertyOptional({
    description: 'Additional fields for the question',
    example: {}
  })
  @IsObject()
  @IsOptional()
  extraFields?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sort order for displaying the question',
    example: 0,
    default: 0
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the question is active',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
