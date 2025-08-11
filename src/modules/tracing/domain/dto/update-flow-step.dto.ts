import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional }                                           from '@nestjs/swagger';
import { StepType }                                                      from '../enums/step-type.enum';

/**
 * DTO for updating a flow step
 */
export class UpdateFlowStepDto {
  @ApiPropertyOptional({
    description: 'Unique key for the step within the flow',
    example: 'quality_check'
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Display name of the step',
    example: 'Quality Control Check'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of the step',
    enum: StepType,
    example: StepType.STANDARD
  })
  @IsOptional()
  @IsEnum(StepType)
  type?: StepType;

  @ApiPropertyOptional({
    description: 'Position of the step in the canvas',
    example: {x: 100, y: 200}
  })
  @IsOptional()
  @IsObject()
  position?: { x: number; y: number };

  @ApiPropertyOptional({
    description: 'Order of the step in the flow',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Description of the step',
    example: 'Perform quality control checks on the product'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Configuration JSON for the step',
    example: {timeout: 3600, requiresApproval: true}
  })
  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the step is active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
