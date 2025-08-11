import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional }                                                                    from '@nestjs/swagger';
import { Type }                                                                                   from 'class-transformer';
import { RuleActionDto, RuleWhenConfigDto }                                                       from './create-termination-rule.dto';

/**
 * DTO for updating a termination rule
 */
export class UpdateTerminationRuleDto {
  @ApiPropertyOptional({
    description: 'Scope of the rule',
    enum: [ 'STEP', 'FLOW' ],
    example: 'STEP'
  })
  @IsOptional()
  @IsEnum([ 'STEP', 'FLOW' ])
  scope?: 'STEP' | 'FLOW';

  @ApiPropertyOptional({
    description: 'When configuration for the rule',
    type: RuleWhenConfigDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleWhenConfigDto)
  whenConfig?: RuleWhenConfigDto;

  @ApiPropertyOptional({
    description: 'Condition expression to evaluate',
    example: 'waste.totalQty > 0 && fields.tratamiento_ok === true'
  })
  @IsOptional()
  @IsString()
  conditionExpr?: string;

  @ApiPropertyOptional({
    description: 'Actions to execute when condition is met',
    type: [ RuleActionDto ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => RuleActionDto)
  actionsJson?: RuleActionDto[];

  @ApiPropertyOptional({
    description: 'Name of the rule',
    example: 'Waste Detection Rule'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the rule',
    example: 'Sends email and adjusts inventory when waste is detected'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority of the rule (higher number = higher priority)',
    example: 10,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the rule',
    example: {category: 'quality', severity: 'high'}
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
