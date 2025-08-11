import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                                                   from '@nestjs/swagger';
import { Type }                                                                                               from 'class-transformer';

/**
 * DTO for rule when configuration
 */
export class RuleWhenConfigDto {
  @ApiProperty({
    description: 'Event that triggers the rule',
    enum: [ 'onStepEnd', 'onFlowEnd' ],
    example: 'onStepEnd'
  })
  @IsString()
  @IsNotEmpty()
  event: 'onStepEnd' | 'onFlowEnd';

  @ApiPropertyOptional({
    description: 'Step key for step-specific rules',
    example: 'quality_check'
  })
  @IsOptional()
  @IsString()
  stepKey?: string;
}

/**
 * DTO for rule action
 */
export class RuleActionDto {
  @ApiProperty({
    description: 'Type of action to execute',
    enum: [ 'SEND_EMAIL', 'CANCEL_FLOW', 'CREATE_ORDER', 'INVENTORY_ADJUST', 'CALL_WEBHOOK' ],
    example: 'SEND_EMAIL'
  })
  @IsString()
  @IsNotEmpty()
  type: 'SEND_EMAIL' | 'CANCEL_FLOW' | 'CREATE_ORDER' | 'INVENTORY_ADJUST' | 'CALL_WEBHOOK';

  @ApiPropertyOptional({
    description: 'Email recipients (for SEND_EMAIL)',
    example: [ 'qa@empresa.cl', 'supervisor@empresa.cl' ]
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  to?: string[];

  @ApiPropertyOptional({
    description: 'Email subject (for SEND_EMAIL)',
    example: 'Mermas detectadas en ${instance.id}'
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Email template ID (for SEND_EMAIL)',
    example: 'tpl-mermas'
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Cancellation reason (for CANCEL_FLOW)',
    example: 'Automatic cancellation due to excessive waste'
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Order type (for CREATE_ORDER)',
    example: 'RESTOCK'
  })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional({
    description: 'Adjustment type (for INVENTORY_ADJUST)',
    enum: [ 'INCREASE', 'DECREASE' ],
    example: 'DECREASE'
  })
  @IsOptional()
  @IsString()
  adjustmentType?: 'INCREASE' | 'DECREASE';

  @ApiPropertyOptional({
    description: 'Product SKU (for INVENTORY_ADJUST)',
    example: '${fields.sku}'
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Quantity (for INVENTORY_ADJUST)',
    example: '${waste.totalQty}'
  })
  @IsOptional()
  qty?: string | number;

  @ApiPropertyOptional({
    description: 'Lot number (for INVENTORY_ADJUST)',
    example: '${fields.lote}'
  })
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL (for CALL_WEBHOOK)',
    example: 'https://api.external.com/webhook'
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'HTTP method (for CALL_WEBHOOK)',
    enum: [ 'GET', 'POST', 'PUT', 'PATCH' ],
    example: 'POST'
  })
  @IsOptional()
  @IsString()
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';

  @ApiPropertyOptional({
    description: 'HTTP headers (for CALL_WEBHOOK)',
    example: {'Content-Type': 'application/json', 'Authorization': 'Bearer token'}
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Request body (for CALL_WEBHOOK)',
    example: {instanceId: '${instance.id}', wasteQty: '${waste.totalQty}'}
  })
  @IsOptional()
  @IsObject()
  body?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional payload data',
    example: {instanceId: '${instance.id}', stepKey: '${step.key}'}
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

/**
 * DTO for creating a new termination rule
 */
export class CreateTerminationRuleDto {
  @ApiProperty({
    description: 'ID of the flow version this rule belongs to',
    example: 'version-123'
  })
  @IsString()
  @IsNotEmpty()
  flowVersionId: string;

  @ApiProperty({
    description: 'Scope of the rule',
    enum: [ 'STEP', 'FLOW' ],
    example: 'STEP'
  })
  @IsEnum([ 'STEP', 'FLOW' ])
  scope: 'STEP' | 'FLOW';

  @ApiProperty({
    description: 'When configuration for the rule',
    type: RuleWhenConfigDto
  })
  @ValidateNested()
  @Type(() => RuleWhenConfigDto)
  whenConfig: RuleWhenConfigDto;

  @ApiProperty({
    description: 'Condition expression to evaluate',
    example: 'waste.totalQty > 0 && fields.tratamiento_ok === true'
  })
  @IsString()
  @IsNotEmpty()
  conditionExpr: string;

  @ApiProperty({
    description: 'Actions to execute when condition is met',
    type: [ RuleActionDto ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => RuleActionDto)
  actionsJson: RuleActionDto[];

  @ApiProperty({
    description: 'Name of the rule',
    example: 'Waste Detection Rule'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the rule',
    example: 'Sends email and adjusts inventory when waste is detected'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    example: true,
    default: true
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
