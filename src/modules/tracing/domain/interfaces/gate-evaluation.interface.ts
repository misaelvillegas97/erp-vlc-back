/**
 * JSONLogic rule type for gate conditions
 */
export type JsonLogicRule = {
  [operator: string]: any;
};

/**
 * Configuration for a gate step
 */
export interface GateConfig {
  conditions: GateCondition[];
  evaluationMode: 'FIRST_MATCH' | 'ALL_MATCH';
  defaultTargetStepId?: string;
}

/**
 * Individual gate condition with target step and evaluation logic
 */
export interface GateCondition {
  targetStepId: string;
  logic: JsonLogicRule;
  priority: number;
  label: string;
  isDefault?: boolean;
}

/**
 * Context data for gate evaluation
 */
export interface GateEvaluationContext {
  instanceId: string;
  instanceStartedAt: Date;
  fields: Record<string, any>;
  wastes?: Array<{ quantity: number; reason: string }>;
  flowContext?: Record<string, any>;
  previousSteps?: PreviousStepData[];
}

/**
 * Data from previously executed steps
 */
export interface PreviousStepData {
  stepKey: string;
  fields: Record<string, any>;
  wastes: Array<{ quantity: number; reason: string }>;
  executedAt: Date;
  executedBy: string;
}

/**
 * Result of gate evaluation
 */
export interface GateEvaluationResult {
  targetStepIds: string[];
  evaluatedConditions: Array<{
    condition: GateCondition;
    result: boolean;
    error?: string;
  }>;
  defaultUsed: boolean;
}

/**
 * Validation result for JSONLogic rules
 */
export interface JsonLogicValidationResult {
  isValid: boolean;
  error?: string;
}
