import { Injectable, Logger } from '@nestjs/common';
import * as jsonLogic         from 'json-logic-js';
import {
  GateCondition,
  GateConfig,
  GateEvaluationContext,
  GateEvaluationResult,
  JsonLogicRule,
  JsonLogicValidationResult,
  PreviousStepData
}                             from '../domain/interfaces/gate-evaluation.interface';

/**
 * Service for evaluating gate conditions using JSONLogic
 * Handles the decision logic for gate-type flow steps
 */
@Injectable()
export class GateEvaluationService {
  private readonly logger = new Logger(GateEvaluationService.name);

  /**
   * Evaluates gate conditions and returns the target step IDs
   * @param gateConfig - Configuration of the gate step
   * @param context - Context data for evaluation
   * @returns Evaluation results
   */
  evaluateGateConditions(
    gateConfig: GateConfig,
    context: GateEvaluationContext
  ): GateEvaluationResult {
    this.logger.log(`Evaluating gate conditions for instance ${ context.instanceId }`);

    const result: GateEvaluationResult = {
      targetStepIds: [],
      evaluatedConditions: [],
      defaultUsed: false
    };

    // Prepare data for JSONLogic evaluation
    const evaluationData = this.prepareEvaluationData(context);

    // Sort conditions by priority
    const sortedConditions = [ ...gateConfig.conditions ]
      .filter(c => !c.isDefault)
      .sort((a, b) => a.priority - b.priority);

    // Evaluate each condition
    for (const condition of sortedConditions) {
      const conditionResult = this.evaluateCondition(condition, evaluationData);
      result.evaluatedConditions.push(conditionResult);

      if (conditionResult.result === true) {
        result.targetStepIds.push(condition.targetStepId);

        // If FIRST_MATCH, stop after first successful condition
        if (gateConfig.evaluationMode === 'FIRST_MATCH') {
          break;
        }
      }
    }

    // If no conditions matched, use default target if available
    if (result.targetStepIds.length === 0 && gateConfig.defaultTargetStepId) {
      result.targetStepIds.push(gateConfig.defaultTargetStepId);
      result.defaultUsed = true;
      this.logger.log(`No conditions matched, using default target: ${ gateConfig.defaultTargetStepId }`);
    }

    this.logger.log(`Gate evaluation result: ${ result.targetStepIds.length } target steps selected`);
    return result;
  }

  /**
   * Validates a JSONLogic rule for syntax and basic structure
   * @param rule - JSONLogic rule to validate
   * @returns Validation result with error details if invalid
   */
  validateJsonLogicRule(rule: JsonLogicRule): JsonLogicValidationResult {
    try {
      // Test with sample data to ensure the rule is syntactically correct
      const testData = this.createTestData();

      // Attempt to apply the rule
      const result = jsonLogic.apply(rule, testData);

      // Verify the result is a boolean or can be coerced to boolean
      if (typeof result !== 'boolean' && typeof result !== 'number' && typeof result !== 'string') {
        return {
          isValid: false,
          error: 'Rule must evaluate to a boolean, number, or string value'
        };
      }

      return {isValid: true};
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSONLogic rule: ${ error.message }`
      };
    }
  }

  /**
   * Creates sample evaluation data for testing purposes
   * @returns Test data structure
   */
  createTestData(): Record<string, any> {
    return {
      fields: {
        cantidad: 100,
        tipo_producto: 'perecedero',
        dias_vencimiento: 5,
        estado_producto: 'bueno',
        tratamiento_ok: true,
        categoria: 'categoria_a'
      },
      waste: {
        totalQty: 0,
        records: []
      },
      context: {
        temperature: 20,
        humidity: 60
      },
      previousSteps: {
        inspeccion: {
          fields: {resultado: 'aprobado'},
          wastes: [],
          executedAt: new Date().toISOString(),
          executedBy: 'test-user'
        }
      },
      instance: {
        id: 'test-instance',
        startedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Creates a sample gate configuration for testing
   * @returns Sample gate configuration
   */
  createSampleGateConfig(): GateConfig {
    return {
      evaluationMode: 'FIRST_MATCH',
      conditions: [
        {
          targetStepId: 'step_reject',
          priority: 1,
          label: 'Producto dañado o vencido',
          logic: {
            'or': [
              {'==': [ {'var': 'fields.estado_producto'}, 'dañado' ]},
              {'<': [ {'var': 'fields.dias_vencimiento'}, 0 ]}
            ]
          }
        },
        {
          targetStepId: 'step_discount',
          priority: 2,
          label: 'Producto próximo a vencer',
          logic: {
            'and': [
              {'<=': [ {'var': 'fields.dias_vencimiento'}, 7 ]},
              {'>': [ {'var': 'fields.dias_vencimiento'}, 0 ]}
            ]
          }
        },
        {
          targetStepId: 'step_normal_inventory',
          priority: 3,
          label: 'Producto en buen estado',
          logic: {'>': [ {'var': 'fields.dias_vencimiento'}, 7 ]}
        }
      ],
      defaultTargetStepId: 'step_manual_review'
    };
  }

  /**
   * Prepares the evaluation data structure for JSONLogic
   * @param context - Gate evaluation context
   * @returns Formatted data for JSONLogic evaluation
   */
  private prepareEvaluationData(context: GateEvaluationContext): Record<string, any> {
    return {
      fields: context.fields || {},
      waste: {
        totalQty: context.wastes?.reduce((sum, w) => sum + w.quantity, 0) || 0,
        records: context.wastes || []
      },
      context: context.flowContext || {},
      previousSteps: this.buildPreviousStepsMap(context.previousSteps || []),
      instance: {
        id: context.instanceId,
        startedAt: context.instanceStartedAt.toISOString()
      }
    };
  }

  /**
   * Builds a map of previous steps for easy access in JSONLogic rules
   * @param previousSteps - Array of previous step data
   * @returns Map of step data keyed by step key
   */
  private buildPreviousStepsMap(previousSteps: PreviousStepData[]): Record<string, any> {
    const stepsMap: Record<string, any> = {};

    for (const step of previousSteps) {
      stepsMap[step.stepKey] = {
        fields: step.fields || {},
        wastes: step.wastes || [],
        executedAt: step.executedAt.toISOString(),
        executedBy: step.executedBy
      };
    }

    return stepsMap;
  }

  /**
   * Evaluates a single gate condition
   * @param condition - Gate condition to evaluate
   * @param data - Evaluation data
   * @returns Condition evaluation result
   */
  private evaluateCondition(
    condition: GateCondition,
    data: Record<string, any>
  ): { condition: GateCondition; result: boolean; error?: string } {
    try {
      this.logger.debug(`Evaluating condition: ${ condition.label }`);

      const result = jsonLogic.apply(condition.logic, data);
      const booleanResult = Boolean(result);

      this.logger.debug(`Condition "${ condition.label }" evaluated to: ${ booleanResult }`);

      return {
        condition,
        result: booleanResult
      };
    } catch (error) {
      this.logger.error(`Error evaluating condition "${ condition.label }": ${ error.message }`);

      return {
        condition,
        result: false,
        error: error.message
      };
    }
  }
}
