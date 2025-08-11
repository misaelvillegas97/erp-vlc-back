import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                          from '@nestjs/swagger';
import { StepType }                                                                  from '../enums/step-type.enum';

/**
 * DTO for creating a new flow step
 */
export class CreateFlowStepDto {
  @ApiProperty({
    description: 'ID of the flow version this step belongs to',
    example: 'version-123'
  })
  @IsString()
  @IsNotEmpty()
  flowVersionId: string;

  @ApiProperty({
    description: 'Unique key for the step within the flow',
    example: 'quality_check'
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Display name of the step',
    example: 'Quality Control Check'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the step',
    enum: StepType,
    example: StepType.STANDARD
  })
  @IsEnum(StepType)
  type: StepType;

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
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
