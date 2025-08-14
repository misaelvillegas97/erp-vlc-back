import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type }                                                  from 'class-transformer';
import { ApiProperty, ApiPropertyOptional }                      from '@nestjs/swagger';

/**
 * DTO for gate condition configuration
 */
export class GateConditionDto {
  @ApiProperty({
    description: 'Target step ID when this condition is met',
    example: 'step_reject_001'
  })
  @IsString()
  targetStepId: string;

  @ApiProperty({
    description: 'JSONLogic rule for evaluation',
    example: {'and': [ {'>': [ {'var': 'fields.cantidad'}, 100 ]}, {'==': [ {'var': 'fields.tipo'}, 'perecedero' ]} ]}
  })
  logic: Record<string, any>;

  @ApiProperty({
    description: 'Priority for condition evaluation (lower numbers = higher priority)',
    example: 1
  })
  priority: number;

  @ApiProperty({
    description: 'Human-readable label for the condition',
    example: 'Producto perecedero con alta cantidad'
  })
  @IsString()
  label: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default condition',
    default: false
  })
  @IsOptional()
  isDefault?: boolean;
}

/**
 * DTO for gate configuration
 */
export class GateConfigDto {
  @ApiProperty({
    description: 'List of conditions for the gate',
    type: [ GateConditionDto ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => GateConditionDto)
  conditions: GateConditionDto[];

  @ApiProperty({
    description: 'Evaluation mode for conditions',
    enum: [ 'FIRST_MATCH', 'ALL_MATCH' ],
    example: 'FIRST_MATCH'
  })
  @IsEnum([ 'FIRST_MATCH', 'ALL_MATCH' ])
  evaluationMode: 'FIRST_MATCH' | 'ALL_MATCH';

  @ApiPropertyOptional({
    description: 'Default target step ID if no conditions match',
    example: 'step_manual_review'
  })
  @IsOptional()
  @IsString()
  defaultTargetStepId?: string;
}

/**
 * DTO for gate validation request
 */
export class ValidateGateRuleDto {
  @ApiProperty({
    description: 'JSONLogic rule to validate',
    example: {'>': [ {'var': 'fields.cantidad'}, 100 ]}
  })
  rule: Record<string, any>;
}

/**
 * DTO for gate validation response
 */
export class GateValidationResultDto {
  @ApiProperty({
    description: 'Whether the rule is valid',
    example: true
  })
  isValid: boolean;

  @ApiPropertyOptional({
    description: 'Error message if validation failed',
    example: 'Invalid JSONLogic rule: Unexpected token'
  })
  error?: string;
}

/**
 * DTO for gate evaluation result
 */
export class GateEvaluationResultDto {
  @ApiProperty({
    description: 'List of target step IDs selected by gate evaluation',
    example: [ 'step_inventory_normal', 'step_quality_check' ]
  })
  targetStepIds: string[];

  @ApiProperty({
    description: 'Details of each condition evaluation',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        condition: {$ref: '#/components/schemas/GateConditionDto'},
        result: {type: 'boolean'},
        error: {type: 'string', nullable: true}
      }
    }
  })
  evaluatedConditions: Array<{
    condition: GateConditionDto;
    result: boolean;
    error?: string;
  }>;

  @ApiProperty({
    description: 'Whether the default target was used',
    example: false
  })
  defaultUsed: boolean;
}
