import { Test, TestingModule }               from '@nestjs/testing';
import { GateEvaluationService }             from './gate-evaluation.service';
import { GateConfig, GateEvaluationContext } from '../domain/interfaces/gate-evaluation.interface';

describe('GateEvaluationService', () => {
  let service: GateEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ GateEvaluationService ],
    }).compile();

    service = module.get<GateEvaluationService>(GateEvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateGateConditions', () => {
    it('should evaluate simple conditions correctly', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'FIRST_MATCH',
        conditions: [
          {
            targetStepId: 'step_reject',
            priority: 1,
            label: 'Quantity too high',
            logic: {'>': [ {'var': 'fields.cantidad'}, 100 ]}
          },
          {
            targetStepId: 'step_normal',
            priority: 2,
            label: 'Normal quantity',
            logic: {'<=': [ {'var': 'fields.cantidad'}, 100 ]}
          }
        ]
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {cantidad: 150},
        wastes: [],
        flowContext: {},
        previousSteps: []
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_reject' ]);
      expect(result.defaultUsed).toBe(false);
      expect(result.evaluatedConditions).toHaveLength(1);
      expect(result.evaluatedConditions[0].result).toBe(true);
    });

    it('should use default target when no conditions match', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'FIRST_MATCH',
        conditions: [
          {
            targetStepId: 'step_reject',
            priority: 1,
            label: 'Quantity too high',
            logic: {'>': [ {'var': 'fields.cantidad'}, 200 ]}
          }
        ],
        defaultTargetStepId: 'step_manual_review'
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {cantidad: 50},
        wastes: [],
        flowContext: {},
        previousSteps: []
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_manual_review' ]);
      expect(result.defaultUsed).toBe(true);
      expect(result.evaluatedConditions[0].result).toBe(false);
    });

    it('should evaluate compound conditions with AND logic', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'FIRST_MATCH',
        conditions: [
          {
            targetStepId: 'step_discount',
            priority: 1,
            label: 'Perishable and near expiry',
            logic: {
              'and': [
                {'==': [ {'var': 'fields.tipo_producto'}, 'perecedero' ]},
                {'<=': [ {'var': 'fields.dias_vencimiento'}, 7 ]}
              ]
            }
          }
        ]
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {
          tipo_producto: 'perecedero',
          dias_vencimiento: 5
        },
        wastes: [],
        flowContext: {},
        previousSteps: []
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_discount' ]);
      expect(result.evaluatedConditions[0].result).toBe(true);
    });

    it('should evaluate ALL_MATCH mode correctly', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'ALL_MATCH',
        conditions: [
          {
            targetStepId: 'step_quality_check',
            priority: 1,
            label: 'Has quantity',
            logic: {'>': [ {'var': 'fields.cantidad'}, 0 ]}
          },
          {
            targetStepId: 'step_inventory_update',
            priority: 2,
            label: 'Has SKU',
            logic: {'!=': [ {'var': 'fields.sku'}, null ]}
          }
        ]
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {
          cantidad: 50,
          sku: 'SKU123'
        },
        wastes: [],
        flowContext: {},
        previousSteps: []
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_quality_check', 'step_inventory_update' ]);
      expect(result.evaluatedConditions).toHaveLength(2);
      expect(result.evaluatedConditions.every(c => c.result === true)).toBe(true);
    });

    it('should handle conditions with waste data', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'FIRST_MATCH',
        conditions: [
          {
            targetStepId: 'step_waste_process',
            priority: 1,
            label: 'Has waste',
            logic: {'>': [ {'var': 'waste.totalQty'}, 0 ]}
          }
        ]
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {},
        wastes: [
          {quantity: 5, reason: 'damaged'},
          {quantity: 3, reason: 'expired'}
        ],
        flowContext: {},
        previousSteps: []
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_waste_process' ]);
      expect(result.evaluatedConditions[0].result).toBe(true);
    });

    it('should handle conditions with previous steps data', () => {
      // Arrange
      const gateConfig: GateConfig = {
        evaluationMode: 'FIRST_MATCH',
        conditions: [
          {
            targetStepId: 'step_rework',
            priority: 1,
            label: 'Previous inspection failed',
            logic: {'==': [ {'var': 'previousSteps.inspeccion.fields.resultado'}, 'rechazado' ]}
          }
        ]
      };

      const context: GateEvaluationContext = {
        instanceId: 'test-instance',
        instanceStartedAt: new Date(),
        fields: {},
        wastes: [],
        flowContext: {},
        previousSteps: [
          {
            stepKey: 'inspeccion',
            fields: {resultado: 'rechazado'},
            wastes: [],
            executedAt: new Date(),
            executedBy: 'inspector1'
          }
        ]
      };

      // Act
      const result = service.evaluateGateConditions(gateConfig, context);

      // Assert
      expect(result.targetStepIds).toEqual([ 'step_rework' ]);
      expect(result.evaluatedConditions[0].result).toBe(true);
    });
  });

  describe('validateJsonLogicRule', () => {
    it('should validate a correct JSONLogic rule', () => {
      // Arrange
      const rule = {'>': [ {'var': 'fields.cantidad'}, 100 ]};

      // Act
      const result = service.validateJsonLogicRule(rule);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid JSONLogic rule', () => {
      // Arrange
      const rule = {'invalid_operator': [ {'var': 'fields.cantidad'}, 100 ]};

      // Act
      const result = service.validateJsonLogicRule(rule);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createSampleGateConfig', () => {
    it('should create a valid sample gate configuration', () => {
      // Act
      const sampleConfig = service.createSampleGateConfig();

      // Assert
      expect(sampleConfig.evaluationMode).toBe('FIRST_MATCH');
      expect(sampleConfig.conditions).toHaveLength(3);
      expect(sampleConfig.defaultTargetStepId).toBe('step_manual_review');
      expect(sampleConfig.conditions[0].targetStepId).toBe('step_reject');
    });
  });
});
