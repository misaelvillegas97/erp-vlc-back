import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RuleActionDto, RuleWhenConfigDto } from './create-termination-rule.dto';

/**
 * DTO for termination rule response
 */
export class TerminationRuleResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the termination rule',
    example: 'rule-123'
  })
  id: string;

  @ApiProperty({
    description: 'ID of the flow version this rule belongs to',
    example: 'version-123'
  })
  flowVersionId: string;

  @ApiProperty({
    description: 'Scope of the rule',
    enum: [ 'STEP', 'FLOW' ],
    example: 'STEP'
  })
  scope: 'STEP' | 'FLOW';

  @ApiProperty({
    description: 'When configuration for the rule',
    type: RuleWhenConfigDto
  })
  whenConfig: RuleWhenConfigDto;

  @ApiProperty({
    description: 'Condition expression to evaluate',
    example: 'waste.totalQty > 0 && fields.tratamiento_ok === true'
  })
  conditionExpr: string;

  @ApiProperty({
    description: 'Actions to execute when condition is met',
    type: [ RuleActionDto ]
  })
  actionsJson: RuleActionDto[];

  @ApiProperty({
    description: 'Name of the rule',
    example: 'Waste Detection Rule'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the rule',
    example: 'Sends email and adjusts inventory when waste is detected'
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the rule is active',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Priority of the rule (higher number = higher priority)',
    example: 10
  })
  priority: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the rule',
    example: {category: 'quality', severity: 'high'}
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-08T02:13:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-08-08T02:13:00Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Whether this rule can be edited (version is DRAFT)',
    example: true
  })
  canEdit?: boolean;

  @ApiPropertyOptional({
    description: 'Number of times this rule has been triggered',
    example: 15
  })
  executionCount?: number;

  @ApiPropertyOptional({
    description: 'Last time this rule was triggered',
    example: '2025-08-08T02:13:00Z'
  })
  lastTriggeredAt?: Date;

  @ApiPropertyOptional({
    description: 'Validation status of the rule condition',
    example: {valid: true, errors: []}
  })
  validationStatus?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  @ApiPropertyOptional({
    description: 'Summary of action types in this rule',
    example: [ 'SEND_EMAIL', 'INVENTORY_ADJUST' ]
  })
  actionTypes?: string[];
}
