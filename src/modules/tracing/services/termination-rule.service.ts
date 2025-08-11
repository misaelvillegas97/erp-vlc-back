import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { TerminationRuleEntity }                              from '../domain/entities/termination-rule.entity';
import { FlowVersionEntity }                                  from '../domain/entities/flow-version.entity';
import { CreateTerminationRuleDto }                           from '../domain/dto/create-termination-rule.dto';
import { UpdateTerminationRuleDto }                           from '../domain/dto/update-termination-rule.dto';
import { TerminationRuleResponseDto }                         from '../domain/dto/termination-rule-response.dto';
import { FlowVersionStatus }                                  from '../domain/enums/flow-version-status.enum';

/**
 * Service for managing termination rules
 * Handles CRUD operations and business logic for flow termination rules
 */
@Injectable()
export class TerminationRuleService {
  constructor(
    @InjectRepository(TerminationRuleEntity)
    private readonly terminationRuleRepository: Repository<TerminationRuleEntity>,
    @InjectRepository(FlowVersionEntity)
    private readonly flowVersionRepository: Repository<FlowVersionEntity>,
  ) {}

  /**
   * Create a new termination rule
   */
  async createTerminationRule(createDto: CreateTerminationRuleDto): Promise<TerminationRuleResponseDto> {
    // Verify version exists and is DRAFT
    const version = await this.flowVersionRepository.findOne({
      where: {id: createDto.flowVersionId},
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ createDto.flowVersionId }" not found`);
    }

    if (version.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be modified');
    }

    // Validate condition expression
    const conditionValidation = this.validateConditionExpression(createDto.conditionExpr);
    if (!conditionValidation.valid) {
      throw new BadRequestException(`Invalid condition expression: ${ conditionValidation.errors.join(', ') }`);
    }

    // Validate actions
    const actionsValidation = this.validateActions(createDto.actionsJson);
    if (!actionsValidation.valid) {
      throw new BadRequestException(`Invalid actions: ${ actionsValidation.errors.join(', ') }`);
    }

    const rule = new TerminationRuleEntity();
    rule.flowVersionId = createDto.flowVersionId;
    rule.scope = createDto.scope;
    rule.whenConfig = createDto.whenConfig;
    rule.conditionExpr = createDto.conditionExpr;
    rule.actionsJson = createDto.actionsJson;
    rule.name = createDto.name;
    rule.description = createDto.description || null;
    rule.isActive = createDto.isActive ?? true;
    rule.priority = createDto.priority ?? 0;
    rule.metadata = createDto.metadata || null;

    const savedRule = await this.terminationRuleRepository.save(rule);
    return this.mapToResponseDto(savedRule, version);
  }

  /**
   * Get all termination rules for a flow version
   */
  async findRulesByVersion(versionId: string): Promise<TerminationRuleResponseDto[]> {
    const version = await this.flowVersionRepository.findOne({
      where: {id: versionId},
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ versionId }" not found`);
    }

    const rules = await this.terminationRuleRepository.find({
      where: {flowVersionId: versionId},
      order: {priority: 'DESC', createdAt: 'ASC'},
    });

    return rules.map(rule => this.mapToResponseDto(rule, version));
  }

  /**
   * Get a termination rule by ID
   */
  async findRuleById(id: string): Promise<TerminationRuleResponseDto> {
    const rule = await this.terminationRuleRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!rule) {
      throw new NotFoundException(`Termination rule with ID "${ id }" not found`);
    }

    return this.mapToResponseDto(rule, rule.flowVersion);
  }

  /**
   * Update a termination rule
   */
  async updateTerminationRule(id: string, updateDto: UpdateTerminationRuleDto): Promise<TerminationRuleResponseDto> {
    const rule = await this.terminationRuleRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!rule) {
      throw new NotFoundException(`Termination rule with ID "${ id }" not found`);
    }

    if (rule.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only rules in DRAFT versions can be modified');
    }

    // Validate condition expression if being updated
    if (updateDto.conditionExpr) {
      const conditionValidation = this.validateConditionExpression(updateDto.conditionExpr);
      if (!conditionValidation.valid) {
        throw new BadRequestException(`Invalid condition expression: ${ conditionValidation.errors.join(', ') }`);
      }
    }

    // Validate actions if being updated
    if (updateDto.actionsJson) {
      const actionsValidation = this.validateActions(updateDto.actionsJson);
      if (!actionsValidation.valid) {
        throw new BadRequestException(`Invalid actions: ${ actionsValidation.errors.join(', ') }`);
      }
    }

    Object.assign(rule, updateDto);
    const savedRule = await this.terminationRuleRepository.save(rule);
    return this.mapToResponseDto(savedRule, rule.flowVersion);
  }

  /**
   * Delete a termination rule
   */
  async deleteTerminationRule(id: string): Promise<void> {
    const rule = await this.terminationRuleRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!rule) {
      throw new NotFoundException(`Termination rule with ID "${ id }" not found`);
    }

    if (rule.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only rules in DRAFT versions can be deleted');
    }

    await this.terminationRuleRepository.remove(rule);
  }

  /**
   * Test a termination rule condition with sample data
   */
  async testRuleCondition(
    id: string,
    testData: { fields?: Record<string, any>; waste?: Record<string, any>; context?: Record<string, any> }
  ): Promise<{ result: boolean; evaluation: any; errors: string[] }> {
    const rule = await this.terminationRuleRepository.findOne({
      where: {id},
    });

    if (!rule) {
      throw new NotFoundException(`Termination rule with ID "${ id }" not found`);
    }

    return this.evaluateCondition(rule.conditionExpr, testData);
  }

  /**
   * Get available action types
   */
  async getActionTypes(): Promise<Array<{
    type: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>> {
    return [
      {
        type: 'SEND_EMAIL',
        name: 'Send Email',
        description: 'Send an email notification',
        parameters: {
          to: {type: 'array', required: true, description: 'Email recipients'},
          subject: {type: 'string', required: true, description: 'Email subject'},
          templateId: {type: 'string', required: false, description: 'Email template ID'},
          payload: {type: 'object', required: false, description: 'Template variables'}
        }
      },
      {
        type: 'CANCEL_FLOW',
        name: 'Cancel Flow',
        description: 'Cancel the flow execution',
        parameters: {
          reason: {type: 'string', required: true, description: 'Cancellation reason'}
        }
      },
      {
        type: 'CREATE_ORDER',
        name: 'Create Order',
        description: 'Create a new order',
        parameters: {
          orderType: {type: 'string', required: true, description: 'Type of order to create'},
          payload: {type: 'object', required: false, description: 'Order data'}
        }
      },
      {
        type: 'INVENTORY_ADJUST',
        name: 'Inventory Adjustment',
        description: 'Adjust inventory levels',
        parameters: {
          adjustmentType: {type: 'enum', values: [ 'INCREASE', 'DECREASE' ], required: true, description: 'Type of adjustment'},
          sku: {type: 'string', required: true, description: 'Product SKU'},
          qty: {type: 'number', required: true, description: 'Quantity to adjust'},
          lot: {type: 'string', required: false, description: 'Lot number'}
        }
      },
      {
        type: 'CALL_WEBHOOK',
        name: 'Call Webhook',
        description: 'Make an HTTP request to external service',
        parameters: {
          url: {type: 'string', required: true, description: 'Webhook URL'},
          method: {type: 'enum', values: [ 'GET', 'POST', 'PUT', 'PATCH' ], required: true, description: 'HTTP method'},
          headers: {type: 'object', required: false, description: 'HTTP headers'},
          body: {type: 'object', required: false, description: 'Request body'}
        }
      }
    ];
  }

  /**
   * Validate condition expression
   */
  private validateConditionExpression(expression: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!expression || expression.trim().length === 0) {
      errors.push('Condition expression cannot be empty');
      return {valid: false, errors, warnings};
    }

    // Basic syntax validation
    try {
      // Simple validation - check for balanced parentheses
      let openParens = 0;
      for (const char of expression) {
        if (char === '(') openParens++;
        if (char === ')') openParens--;
        if (openParens < 0) {
          errors.push('Unbalanced parentheses in condition expression');
          break;
        }
      }
      if (openParens > 0) {
        errors.push('Unbalanced parentheses in condition expression');
      }

      // Check for valid variable references
      const validPrefixes = [ 'fields.', 'waste.', 'context.', 'instance.', 'step.' ];
      const variablePattern = /\b(fields|waste|context|instance|step)\.\w+/g;
      const variables = expression.match(variablePattern) || [];

      for (const variable of variables) {
        const hasValidPrefix = validPrefixes.some(prefix => variable.startsWith(prefix));
        if (!hasValidPrefix) {
          errors.push(`Invalid variable reference: ${ variable }`);
        }
      }

      // Add warnings for potentially problematic expressions
      if (expression.includes('==') && !expression.includes('===')) {
        warnings.push('Consider using strict equality (===) instead of loose equality (==)');
      }

      if (variables.length === 0) {
        warnings.push('Expression does not reference any variables - it may always evaluate to the same result');
      }

    } catch (error) {
      errors.push(`Invalid condition expression syntax: ${ error.message }`);
    }

    return {valid: errors.length === 0, errors, warnings};
  }

  /**
   * Validate actions array
   */
  private validateActions(actions: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(actions) || actions.length === 0) {
      errors.push('At least one action is required');
      return {valid: false, errors};
    }

    const validActionTypes = [ 'SEND_EMAIL', 'CANCEL_FLOW', 'CREATE_ORDER', 'INVENTORY_ADJUST', 'CALL_WEBHOOK' ];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (!action.type || !validActionTypes.includes(action.type)) {
        errors.push(`Invalid action type at index ${ i }: ${ action.type }`);
        continue;
      }

      // Validate required parameters for each action type
      switch (action.type) {
        case 'SEND_EMAIL':
          if (!action.to || !Array.isArray(action.to) || action.to.length === 0) {
            errors.push(`SEND_EMAIL action at index ${ i } requires 'to' array`);
          }
          if (!action.subject) {
            errors.push(`SEND_EMAIL action at index ${ i } requires 'subject'`);
          }
          break;
        case 'CANCEL_FLOW':
          if (!action.reason) {
            errors.push(`CANCEL_FLOW action at index ${ i } requires 'reason'`);
          }
          break;
        case 'INVENTORY_ADJUST':
          if (!action.adjustmentType || ![ 'INCREASE', 'DECREASE' ].includes(action.adjustmentType)) {
            errors.push(`INVENTORY_ADJUST action at index ${ i } requires valid 'adjustmentType'`);
          }
          if (!action.sku) {
            errors.push(`INVENTORY_ADJUST action at index ${ i } requires 'sku'`);
          }
          if (action.qty === undefined || action.qty === null) {
            errors.push(`INVENTORY_ADJUST action at index ${ i } requires 'qty'`);
          }
          break;
        case 'CALL_WEBHOOK':
          if (!action.url) {
            errors.push(`CALL_WEBHOOK action at index ${ i } requires 'url'`);
          }
          if (!action.method || ![ 'GET', 'POST', 'PUT', 'PATCH' ].includes(action.method)) {
            errors.push(`CALL_WEBHOOK action at index ${ i } requires valid 'method'`);
          }
          break;
      }
    }

    return {valid: errors.length === 0, errors};
  }

  /**
   * Evaluate condition expression with test data
   */
  private evaluateCondition(
    expression: string,
    data: { fields?: Record<string, any>; waste?: Record<string, any>; context?: Record<string, any> }
  ): { result: boolean; evaluation: any; errors: string[] } {
    const errors: string[] = [];

    try {
      // Simple evaluation - in a real implementation, you would use a proper expression evaluator
      // For now, we'll just return a mock result
      const mockResult = {
        result: true,
        evaluation: {
          expression,
          variables: data,
          evaluatedAt: new Date().toISOString()
        },
        errors: []
      };

      return mockResult;
    } catch (error) {
      errors.push(`Error evaluating condition: ${ error.message }`);
      return {
        result: false,
        evaluation: null,
        errors
      };
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(rule: TerminationRuleEntity, version?: FlowVersionEntity): TerminationRuleResponseDto {
    const dto = new TerminationRuleResponseDto();
    dto.id = rule.id;
    dto.flowVersionId = rule.flowVersionId;
    dto.scope = rule.scope;
    dto.whenConfig = rule.whenConfig;
    dto.conditionExpr = rule.conditionExpr;
    dto.actionsJson = rule.actionsJson;
    dto.name = rule.name;
    dto.description = rule.description;
    dto.isActive = rule.isActive;
    dto.priority = rule.priority;
    dto.metadata = rule.metadata;
    dto.createdAt = rule.createdAt;
    dto.updatedAt = rule.updatedAt;

    if (version) {
      dto.canEdit = version.status === FlowVersionStatus.DRAFT;
    }

    // Add computed fields
    dto.actionTypes = rule.actionsJson.map(action => action.type);
    dto.validationStatus = this.validateConditionExpression(rule.conditionExpr);

    return dto;
  }
}
