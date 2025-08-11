import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { StepExecutionEntity }                                from '../domain/entities/step-execution.entity';
import { FlowInstanceEntity }                                 from '../domain/entities/flow-instance.entity';
import { FlowStepEntity }                                     from '../domain/entities/flow-step.entity';
import { FieldDefEntity }                                     from '../domain/entities/field-def.entity';
import { FieldValueEntity }                                   from '../domain/entities/field-value.entity';
import { WasteRecordEntity }                                  from '../domain/entities/waste-record.entity';
import { OrderLinkEntity }                                    from '../domain/entities/order-link.entity';
import { CompleteStepDto }                                    from '../domain/dto/execution/complete-step.dto';
import { StepExecutionResponseDto }                           from '../domain/dto/execution/step-execution-response.dto';
import { FlowInstanceStatus, StepExecutionStatus }            from '../domain/enums/execution-status.enum';

/**
 * Service for managing step execution
 * Handles individual step lifecycle and validation logic
 */
@Injectable()
export class StepExecutionService {
  constructor(
    @InjectRepository(StepExecutionEntity)
    private readonly stepExecutionRepository: Repository<StepExecutionEntity>,
    @InjectRepository(FlowInstanceEntity)
    private readonly flowInstanceRepository: Repository<FlowInstanceEntity>,
    @InjectRepository(FlowStepEntity)
    private readonly flowStepRepository: Repository<FlowStepEntity>,
    @InjectRepository(FieldDefEntity)
    private readonly fieldDefRepository: Repository<FieldDefEntity>,
    @InjectRepository(FieldValueEntity)
    private readonly fieldValueRepository: Repository<FieldValueEntity>,
    @InjectRepository(WasteRecordEntity)
    private readonly wasteRecordRepository: Repository<WasteRecordEntity>,
    @InjectRepository(OrderLinkEntity)
    private readonly orderLinkRepository: Repository<OrderLinkEntity>,
  ) {}

  /**
   * Start step execution
   */
  async startStepExecution(
    instanceId: string,
    stepId: string,
    actorId: string,
    notes?: string
  ): Promise<StepExecutionResponseDto> {
    // Verify instance exists and is active
    const instance = await this.flowInstanceRepository.findOne({
      where: {id: instanceId, status: FlowInstanceStatus.ACTIVE},
    });

    if (!instance) {
      throw new NotFoundException(`Active flow instance with ID "${ instanceId }" not found`);
    }

    // Find or create step execution
    let stepExecution = await this.stepExecutionRepository.findOne({
      where: {instanceId, stepId},
      relations: [ 'step', 'step.fields' ],
    });

    if (!stepExecution) {
      // Verify step exists
      const step = await this.flowStepRepository.findOne({
        where: {id: stepId},
        relations: [ 'fields' ],
      });

      if (!step) {
        throw new NotFoundException(`Step with ID "${ stepId }" not found`);
      }

      stepExecution = new StepExecutionEntity();
      stepExecution.instanceId = instanceId;
      stepExecution.stepId = stepId;
      stepExecution.status = StepExecutionStatus.PENDING;
      stepExecution.step = step;
    }

    if (stepExecution.status === StepExecutionStatus.DONE) {
      throw new BadRequestException('Step is already completed');
    }

    if (stepExecution.status === StepExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Step is already in progress');
    }

    // Start the step execution
    stepExecution.status = StepExecutionStatus.IN_PROGRESS;
    stepExecution.startedAt = new Date();
    stepExecution.actorId = actorId;
    if (notes) {
      stepExecution.completionNotes = notes;
    }

    const savedStepExecution = await this.stepExecutionRepository.save(stepExecution);
    return this.mapToResponseDto(savedStepExecution);
  }

  /**
   * Complete step execution
   */
  async completeStepExecution(
    instanceId: string,
    stepId: string,
    completeDto: CompleteStepDto
  ): Promise<StepExecutionResponseDto> {
    // Find step execution
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {instanceId, stepId},
      relations: [ 'step', 'step.fields', 'fieldValues', 'wasteRecords', 'orderLinks' ],
    });

    if (!stepExecution) {
      throw new NotFoundException(`Step execution not found for instance "${ instanceId }" and step "${ stepId }"`);
    }

    if (stepExecution.status === StepExecutionStatus.DONE) {
      throw new BadRequestException('Step is already completed');
    }

    // Validate field values
    const validationResult = await this.validateStepData(instanceId, stepId, completeDto);
    if (!validationResult.valid && !completeDto.forceComplete) {
      throw new BadRequestException(`Validation failed: ${ validationResult.errors.join(', ') }`);
    }

    // Save field values
    if (completeDto.fieldValues && completeDto.fieldValues.length > 0) {
      await this.saveFieldValues(stepExecution.id, completeDto.fieldValues);
    }

    // Save waste records
    if (completeDto.wastes && completeDto.wastes.length > 0) {
      await this.saveWasteRecords(stepExecution.id, completeDto.wastes, completeDto.actorId);
    }

    // Save order links
    if (completeDto.links && completeDto.links.length > 0) {
      await this.saveOrderLinks(stepExecution.id, completeDto.links, completeDto.actorId);
    }

    // Complete the step execution
    stepExecution.status = StepExecutionStatus.DONE;
    stepExecution.finishedAt = new Date();
    stepExecution.actorId = completeDto.actorId;
    stepExecution.completionNotes = completeDto.completionNotes;
    stepExecution.executionData = completeDto.executionData;
    stepExecution.hasErrors = !validationResult.valid;
    if (!validationResult.valid) {
      stepExecution.errorDetails = {
        validationErrors: validationResult.errors,
        warnings: validationResult.warnings,
      };
    }

    const savedStepExecution = await this.stepExecutionRepository.save(stepExecution);

    // Check if this completes the flow
    await this.checkFlowCompletion(instanceId);

    return this.mapToResponseDto(savedStepExecution);
  }

  /**
   * Find step execution by ID
   */
  async findStepExecutionById(executionId: string): Promise<StepExecutionResponseDto> {
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {id: executionId},
      relations: [
        'step',
        'instance',
        'fieldValues',
        'fieldValues.fieldDef',
        'wasteRecords',
        'orderLinks',
      ],
    });

    if (!stepExecution) {
      throw new NotFoundException(`Step execution with ID "${ executionId }" not found`);
    }

    return this.mapToResponseDto(stepExecution);
  }

  /**
   * Find step executions by instance
   */
  async findStepExecutionsByInstance(
    instanceId: string,
    filters: { status?: string; actorId?: string }
  ): Promise<StepExecutionResponseDto[]> {
    const queryBuilder = this.stepExecutionRepository.createQueryBuilder('stepExecution')
      .leftJoinAndSelect('stepExecution.step', 'step')
      .leftJoinAndSelect('stepExecution.fieldValues', 'fieldValues')
      .leftJoinAndSelect('stepExecution.wasteRecords', 'wasteRecords')
      .leftJoinAndSelect('stepExecution.orderLinks', 'orderLinks')
      .where('stepExecution.instanceId = :instanceId', {instanceId});

    if (filters.status) {
      queryBuilder.andWhere('stepExecution.status = :status', {status: filters.status});
    }

    if (filters.actorId) {
      queryBuilder.andWhere('stepExecution.actorId = :actorId', {actorId: filters.actorId});
    }

    queryBuilder.orderBy('step.order', 'ASC');

    const stepExecutions = await queryBuilder.getMany();
    return stepExecutions.map(se => this.mapToResponseDto(se));
  }

  /**
   * Skip step execution
   */
  async skipStepExecution(
    instanceId: string,
    stepId: string,
    actorId: string,
    reason: string,
    notes?: string
  ): Promise<StepExecutionResponseDto> {
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {instanceId, stepId},
      relations: [ 'step' ],
    });

    if (!stepExecution) {
      throw new NotFoundException(`Step execution not found for instance "${ instanceId }" and step "${ stepId }"`);
    }

    if (stepExecution.status === StepExecutionStatus.DONE) {
      throw new BadRequestException('Cannot skip a completed step');
    }

    stepExecution.status = StepExecutionStatus.SKIPPED;
    stepExecution.finishedAt = new Date();
    stepExecution.actorId = actorId;
    stepExecution.completionNotes = `Skipped: ${ reason }${ notes ? ` - ${ notes }` : '' }`;

    const savedStepExecution = await this.stepExecutionRepository.save(stepExecution);
    return this.mapToResponseDto(savedStepExecution);
  }

  /**
   * Restart step execution
   */
  async restartStepExecution(
    instanceId: string,
    stepId: string,
    actorId: string,
    reason: string,
    notes?: string
  ): Promise<StepExecutionResponseDto> {
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {instanceId, stepId},
      relations: [ 'step', 'fieldValues', 'wasteRecords', 'orderLinks' ],
    });

    if (!stepExecution) {
      throw new NotFoundException(`Step execution not found for instance "${ instanceId }" and step "${ stepId }"`);
    }

    if (stepExecution.status === StepExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot restart a step that is in progress');
    }

    // Clear previous execution data
    if (stepExecution.fieldValues) {
      await this.fieldValueRepository.remove(stepExecution.fieldValues);
    }
    if (stepExecution.wasteRecords) {
      await this.wasteRecordRepository.remove(stepExecution.wasteRecords);
    }
    if (stepExecution.orderLinks) {
      await this.orderLinkRepository.remove(stepExecution.orderLinks);
    }

    // Reset step execution
    stepExecution.status = StepExecutionStatus.PENDING;
    stepExecution.startedAt = null;
    stepExecution.finishedAt = null;
    stepExecution.actorId = actorId;
    stepExecution.completionNotes = `Restarted: ${ reason }${ notes ? ` - ${ notes }` : '' }`;
    stepExecution.executionData = null;
    stepExecution.hasErrors = false;
    stepExecution.errorDetails = null;

    const savedStepExecution = await this.stepExecutionRepository.save(stepExecution);
    return this.mapToResponseDto(savedStepExecution);
  }

  /**
   * Get step form data
   */
  async getStepFormData(instanceId: string, stepId: string): Promise<{
    stepId: string;
    stepName: string;
    categories: any[];
    fields: any[];
    currentValues: Record<string, any>;
    validationRules: Record<string, any>;
  }> {
    const step = await this.flowStepRepository.findOne({
      where: {id: stepId},
      relations: [ 'fields', 'fields.category', 'flowVersion' ],
    });

    if (!step) {
      throw new NotFoundException(`Step with ID "${ stepId }" not found`);
    }

    // Get current field values
    const stepExecution = await this.stepExecutionRepository.findOne({
      where: {instanceId, stepId},
      relations: [ 'fieldValues', 'fieldValues.fieldDef' ],
    });

    const currentValues: Record<string, any> = {};
    if (stepExecution?.fieldValues) {
      for (const fieldValue of stepExecution.fieldValues) {
        currentValues[fieldValue.fieldDef.key] = fieldValue.valueJson;
      }
    }

    // Group fields by category
    const categoriesMap = new Map();
    const fields = step.fields || [];

    for (const field of fields) {
      if (field.category) {
        if (!categoriesMap.has(field.category.id)) {
          categoriesMap.set(field.category.id, {
            id: field.category.id,
            name: field.category.name,
            order: field.category.order,
            fields: [],
          });
        }
        categoriesMap.get(field.category.id).fields.push(field);
      }
    }

    const categories = Array.from(categoriesMap.values()).sort((a, b) => a.order - b.order);

    // Build validation rules
    const validationRules: Record<string, any> = {};
    for (const field of fields) {
      validationRules[field.key] = {
        required: field.required,
        type: field.type,
        validationRules: field.validationRules,
      };
    }

    return {
      stepId,
      stepName: step.name,
      categories,
      fields: fields.map(f => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        order: f.order,
        description: f.description,
        placeholder: f.placeholder,
        configJson: f.configJson,
        categoryId: f.categoryId,
      })),
      currentValues,
      validationRules,
    };
  }

  /**
   * Validate step data
   */
  async validateStepData(
    instanceId: string,
    stepId: string,
    validationData: CompleteStepDto
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    fieldValidation: Record<string, any>;
  }> {
    const step = await this.flowStepRepository.findOne({
      where: {id: stepId},
      relations: [ 'fields' ],
    });

    if (!step) {
      throw new NotFoundException(`Step with ID "${ stepId }" not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldValidation: Record<string, any> = {};

    const fieldValues = validationData.fieldValues || [];
    const fieldValueMap = new Map(fieldValues.map(fv => [ fv.fieldKey, fv.value ]));

    // Validate each field
    for (const fieldDef of step.fields || []) {
      const value = fieldValueMap.get(fieldDef.key);
      const fieldErrors: string[] = [];
      const fieldWarnings: string[] = [];

      // Required field validation
      if (fieldDef.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`Field '${ fieldDef.label }' is required`);
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        switch (fieldDef.type) {
          case 'NUMBER':
            if (isNaN(Number(value))) {
              fieldErrors.push(`Field '${ fieldDef.label }' must be a valid number`);
            }
            break;
          case 'DATE':
            if (isNaN(Date.parse(value))) {
              fieldErrors.push(`Field '${ fieldDef.label }' must be a valid date`);
            }
            break;
          case 'BOOLEAN':
            if (typeof value !== 'boolean') {
              fieldErrors.push(`Field '${ fieldDef.label }' must be a boolean value`);
            }
            break;
        }

        // Custom validation rules
        if (fieldDef.validationRules) {
          const rules = fieldDef.validationRules;

          if (rules.minLength && value.length < rules.minLength) {
            fieldErrors.push(`Field '${ fieldDef.label }' must be at least ${ rules.minLength } characters`);
          }

          if (rules.maxLength && value.length > rules.maxLength) {
            fieldErrors.push(`Field '${ fieldDef.label }' must be no more than ${ rules.maxLength } characters`);
          }

          if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
            fieldErrors.push(`Field '${ fieldDef.label }' does not match required format`);
          }
        }
      }

      fieldValidation[fieldDef.key] = {
        valid: fieldErrors.length === 0,
        errors: fieldErrors,
        warnings: fieldWarnings,
      };

      errors.push(...fieldErrors);
      warnings.push(...fieldWarnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldValidation,
    };
  }

  /**
   * Save field values
   */
  private async saveFieldValues(stepExecutionId: string, fieldValues: any[]): Promise<void> {
    // Remove existing field values
    await this.fieldValueRepository.delete({stepExecutionId});

    // Create new field values
    const fieldValueEntities = fieldValues.map(fv => {
      const fieldValue = new FieldValueEntity();
      fieldValue.stepExecutionId = stepExecutionId;
      fieldValue.fieldDefId = fv.fieldDefId; // This would need to be resolved from fieldKey
      fieldValue.valueJson = fv.value;
      fieldValue.rawValue = fv.rawValue;
      fieldValue.metadata = fv.metadata;
      fieldValue.enteredAt = new Date();
      fieldValue.valid = true; // Set based on validation
      return fieldValue;
    });

    await this.fieldValueRepository.save(fieldValueEntities);
  }

  /**
   * Save waste records
   */
  private async saveWasteRecords(stepExecutionId: string, wastes: any[], actorId: string): Promise<void> {
    const wasteEntities = wastes.map(waste => {
      const wasteRecord = new WasteRecordEntity();
      wasteRecord.stepExecutionId = stepExecutionId;
      wasteRecord.qty = waste.qty;
      wasteRecord.reason = waste.reason;
      wasteRecord.affectsInventory = waste.affectsInventory || false;
      wasteRecord.evidenceUrl = waste.evidenceUrl;
      wasteRecord.costImpact = waste.costImpact;
      wasteRecord.sku = waste.sku;
      wasteRecord.lot = waste.lot;
      wasteRecord.notes = waste.notes;
      wasteRecord.metadata = waste.metadata;
      wasteRecord.recordedBy = actorId;
      wasteRecord.recordedAt = new Date();
      return wasteRecord;
    });

    await this.wasteRecordRepository.save(wasteEntities);
  }

  /**
   * Save order links
   */
  private async saveOrderLinks(stepExecutionId: string, links: any[], actorId: string): Promise<void> {
    const linkEntities = links.map(link => {
      const orderLink = new OrderLinkEntity();
      orderLink.stepExecutionId = stepExecutionId;
      orderLink.orderId = link.orderId || 'auto-generated'; // Would need proper order creation logic
      orderLink.mode = link.mode;
      orderLink.linkMetadata = link.linkMetadata;
      orderLink.linkedBy = actorId;
      orderLink.linkedAt = new Date();
      orderLink.notes = link.notes;
      return orderLink;
    });

    await this.orderLinkRepository.save(linkEntities);
  }

  /**
   * Check if flow is completed
   */
  private async checkFlowCompletion(instanceId: string): Promise<void> {
    const stepExecutions = await this.stepExecutionRepository.find({
      where: {instanceId},
    });

    const allCompleted = stepExecutions.every(se =>
      se.status === StepExecutionStatus.DONE || se.status === StepExecutionStatus.SKIPPED
    );

    if (allCompleted) {
      await this.flowInstanceRepository.update(instanceId, {
        status: FlowInstanceStatus.FINISHED,
        finishedAt: new Date(),
      });
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(stepExecution: StepExecutionEntity): StepExecutionResponseDto {
    const dto = new StepExecutionResponseDto();
    dto.id = stepExecution.id;
    dto.instanceId = stepExecution.instanceId;
    dto.stepId = stepExecution.stepId;
    dto.status = stepExecution.status;
    dto.startedAt = stepExecution.startedAt;
    dto.finishedAt = stepExecution.finishedAt;
    dto.actorId = stepExecution.actorId;
    dto.completionNotes = stepExecution.completionNotes;
    dto.executionData = stepExecution.executionData;
    dto.hasErrors = stepExecution.hasErrors;
    dto.errorDetails = stepExecution.errorDetails;
    dto.createdAt = stepExecution.createdAt;
    dto.updatedAt = stepExecution.updatedAt;

    // Add step information
    if (stepExecution.step) {
      dto.stepKey = stepExecution.step.key;
      dto.stepName = stepExecution.step.name;
      dto.stepOrder = stepExecution.step.order;
    }

    // Add computed fields
    if (stepExecution.startedAt && stepExecution.finishedAt) {
      dto.executionTimeSeconds = Math.round(
        (stepExecution.finishedAt.getTime() - stepExecution.startedAt.getTime()) / 1000
      );
    }

    if (stepExecution.fieldValues) {
      dto.fieldValuesCount = stepExecution.fieldValues.length;
    }

    if (stepExecution.wasteRecords) {
      dto.wasteRecordsCount = stepExecution.wasteRecords.length;
      dto.totalWasteQty = stepExecution.wasteRecords.reduce((sum, wr) => sum + Number(wr.qty), 0);
    }

    if (stepExecution.orderLinks) {
      dto.orderLinksCount = stepExecution.orderLinks.length;
    }

    dto.canRestart = stepExecution.status === StepExecutionStatus.DONE || stepExecution.status === StepExecutionStatus.SKIPPED;
    dto.canSkip = stepExecution.status === StepExecutionStatus.PENDING;
    dto.isCurrentStep = stepExecution.status === StepExecutionStatus.IN_PROGRESS;

    return dto;
  }
}
