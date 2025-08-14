# Gate Implementation Guide

## Overview

The Gate implementation provides JSONLogic-based decision points in flow execution. Gates evaluate conditions dynamically to determine which step(s) should execute next based on current flow data, field values, waste records, and previous step results.

## Architecture

### Core Components

1. **GateEvaluationService**: Core service for evaluating JSONLogic conditions
2. **FlowExecutionService**: Extended with gate execution capabilities
3. **GateConfig Interface**: Configuration structure for gate steps
4. **DTOs**: Data transfer objects for API operations

### Key Features

- **JSONLogic Integration**: Safe and structured condition evaluation
- **Multiple Evaluation Modes**: FIRST_MATCH and ALL_MATCH
- **Rich Context Data**: Access to fields, wastes, previous steps, and flow context
- **Priority-based Conditions**: Control evaluation order
- **Default Fallback**: Automatic fallback when no conditions match
- **Comprehensive Validation**: Rule validation and error handling

## Configuration

### Gate Configuration Structure

```typescript
interface GateConfig {
  conditions: GateCondition[];
  evaluationMode: 'FIRST_MATCH' | 'ALL_MATCH';
  defaultTargetStepId?: string;
}

interface GateCondition {
  targetStepId: string;
  logic: JsonLogicRule;
  priority: number;
  label: string;
  isDefault?: boolean;
}
```

### Evaluation Context

The gate evaluation has access to the following context data:

```typescript
interface GateEvaluationContext {
  instanceId: string;
  instanceStartedAt: Date;
  fields: Record<string, any>;                    // Current field values
  wastes?: Array<{ quantity: number; reason: string }>;  // Waste records
  flowContext?: Record<string, any>;              // Flow-level context
  previousSteps?: PreviousStepData[];            // Historical step data
}
```

## JSONLogic Examples

### 1. Simple Field Comparisons

```json
{
  "targetStepId": "step_reject",
  "priority": 1,
  "label": "Quantity exceeds limit",
  "logic": {
    ">": [{ "var": "fields.cantidad" }, 100]
  }
}
```

### 2. Compound Conditions

```json
{
  "targetStepId": "step_discount",
  "priority": 1,
  "label": "Perishable product near expiry",
  "logic": {
    "and": [
      { "==": [{ "var": "fields.tipo_producto" }, "perecedero"] },
      { "<=": [{ "var": "fields.dias_vencimiento" }, 7] },
      { ">": [{ "var": "fields.dias_vencimiento" }, 0] }
    ]
  }
}
```

### 3. Waste-based Conditions

```json
{
  "targetStepId": "step_waste_processing",
  "priority": 1,
  "label": "Has waste to process",
  "logic": {
    "and": [
      { ">": [{ "var": "waste.totalQty" }, 0] },
      { "==": [{ "var": "fields.tratamiento_ok" }, true] }
    ]
  }
}
```

### 4. Previous Steps Conditions

```json
{
  "targetStepId": "step_rework",
  "priority": 1,
  "label": "Previous inspection failed",
  "logic": {
    "==": [
      { "var": "previousSteps.inspeccion.fields.resultado" },
      "rechazado"
    ]
  }
}
```

### 5. Complex Business Logic

```json
{
  "targetStepId": "step_special_handling",
  "priority": 1,
  "label": "High value product with issues",
  "logic": {
    "and": [
      { ">": [{ "var": "fields.valor_unitario" }, 1000] },
      {
        "or": [
          { ">": [{ "var": "waste.totalQty" }, 0] },
          { "==": [{ "var": "fields.estado_producto" }, "dañado"] },
          { "<=": [{ "var": "fields.dias_vencimiento" }, 3] }
        ]
      }
    ]
  }
}
```

### 6. Array Operations

```json
{
  "targetStepId": "step_category_specific",
  "priority": 1,
  "label": "Product in special categories",
  "logic": {
    "in": [
      { "var": "fields.categoria" },
      ["categoria_a", "categoria_b", "categoria_especial"]
    ]
  }
}
```

## Complete Gate Configuration Example

```json
{
  "evaluationMode": "FIRST_MATCH",
  "conditions": [
    {
      "targetStepId": "step_immediate_reject",
      "priority": 1,
      "label": "Producto vencido o dañado",
      "logic": {
        "or": [
          { "==": [{ "var": "fields.estado_producto" }, "dañado"] },
          { "<": [{ "var": "fields.dias_vencimiento" }, 0] }
        ]
      }
    },
    {
      "targetStepId": "step_discount_flow",
      "priority": 2,
      "label": "Producto próximo a vencer",
      "logic": {
        "and": [
          { "<=": [{ "var": "fields.dias_vencimiento" }, 7] },
          { ">": [{ "var": "fields.dias_vencimiento" }, 0] },
          { "==": [{ "var": "fields.tipo_producto" }, "perecedero"] }
        ]
      }
    },
    {
      "targetStepId": "step_quality_check",
      "priority": 3,
      "label": "Producto con mermas pero tratamiento OK",
      "logic": {
        "and": [
          { ">": [{ "var": "waste.totalQty" }, 0] },
          { "==": [{ "var": "fields.tratamiento_ok" }, true] }
        ]
      }
    },
    {
      "targetStepId": "step_normal_inventory",
      "priority": 4,
      "label": "Producto en condiciones normales",
      "logic": {
        "and": [
          { ">": [{ "var": "fields.dias_vencimiento" }, 7] },
          { "==": [{ "var": "waste.totalQty" }, 0] }
        ]
      }
    }
  ],
  "defaultTargetStepId": "step_manual_review"
}
```

## API Integration

### Flow Step Configuration

```typescript
// When creating/updating a flow step of type GATE
const gateStep: FlowStepEntity = {
  type: StepType.GATE,
  configJson: gateConfig,  // The GateConfig object
  // ... other properties
};
```

### Gate Execution

```typescript
// Execute a gate step
const nextStepIds = await flowExecutionService.executeGateStep(
  stepExecutionId,
  actorId
);
```

### Validation

```typescript
// Validate gate configuration
const validation = flowExecutionService.validateGateConfiguration(gateConfig);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

// Validate individual JSONLogic rule
const ruleValidation = gateEvaluationService.validateJsonLogicRule(rule);
if (!ruleValidation.isValid) {
  console.error('Rule error:', ruleValidation.error);
}
```

## Best Practices

### 1. Condition Priority

- Use priority values to control evaluation order
- Lower numbers = higher priority
- Leave gaps between priorities for future insertions

### 2. JSONLogic Rules

- Keep conditions readable with descriptive labels
- Test rules with sample data before deployment
- Use the validation methods to check syntax
- Prefer explicit comparisons over implicit ones

### 3. Default Handling

- Always provide a defaultTargetStepId for robustness
- The default should lead to a safe fallback path
- Consider manual review steps as defaults

### 4. Performance

- Use FIRST_MATCH when only one path is needed
- Use ALL_MATCH when multiple parallel paths are required
- Keep condition complexity reasonable for maintenance

### 5. Testing

- Test all condition branches
- Test edge cases (empty values, null data)
- Test with realistic data volumes
- Validate error handling scenarios

## Error Handling

The gate implementation includes comprehensive error handling:

- **Invalid Configuration**: Validates gate config structure
- **Missing Target Steps**: Ensures target step IDs exist
- **JSONLogic Errors**: Catches and logs evaluation errors
- **Context Issues**: Handles missing or malformed data gracefully
- **Fallback Behavior**: Uses defaults when conditions fail

## Monitoring and Debugging

### Logging

The service provides detailed logging:

```typescript
// Enable debug logging to see condition evaluation details
// Each condition evaluation is logged with results
```

### Audit Trail

Gate decisions are logged for audit purposes:

- Which conditions were evaluated
- Evaluation results for each condition
- Selected target steps
- Whether default was used

## Migration from Previous Implementation

If migrating from a previous implementation:

1. Convert existing condition logic to JSONLogic format
2. Update step configurations to use new GateConfig structure
3. Test all existing flows with the new implementation
4. Update any custom code that relied on old gate behavior

## Frontend Integration

While this document focuses on backend implementation, the gate functionality integrates with:

- Canvas-based flow builders
- Condition editors with visual JSONLogic builders
- Flow execution interfaces
- Debugging and monitoring dashboards

## Troubleshooting

### Common Issues

1. **Condition Never Matches**: Check field names and data types in context
2. **Multiple Steps Executing**: Verify evaluation mode (FIRST_MATCH vs ALL_MATCH)
3. **Default Always Used**: Check condition logic and priority order
4. **Validation Errors**: Use the validation methods to identify issues

### Debug Steps

1. Enable debug logging
2. Check gate configuration structure
3. Validate JSONLogic rules independently
4. Test with minimal sample data
5. Review evaluation context data structure

## Future Enhancements

Potential future improvements:

- Visual condition builder UI components
- Condition templates and libraries
- A/B testing for different gate configurations
- Analytics and reporting on gate decisions
- Integration with external decision engines
- Machine learning-based condition optimization

This implementation provides a solid foundation for complex flow decision logic while maintaining safety, testability, and maintainability.
