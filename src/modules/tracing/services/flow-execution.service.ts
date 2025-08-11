import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { FlowInstanceEntity }                                 from '../domain/entities/flow-instance.entity';
import { FlowTemplateEntity }                                 from '../domain/entities/flow-template.entity';
import { FlowVersionEntity }                                  from '../domain/entities/flow-version.entity';
import { StepExecutionEntity }                                from '../domain/entities/step-execution.entity';
import { CreateFlowInstanceDto }                              from '../domain/dto/execution/create-flow-instance.dto';
import { FlowInstanceResponseDto }                            from '../domain/dto/execution/flow-instance-response.dto';
import { FlowInstanceStatus, StepExecutionStatus }            from '../domain/enums/execution-status.enum';
import { FlowVersionStatus }                                  from '../domain/enums/flow-version-status.enum';

/**
 * Service for managing flow execution
 * Handles flow instance lifecycle and execution logic
 */
@Injectable()
export class FlowExecutionService {
  constructor(
    @InjectRepository(FlowInstanceEntity)
    private readonly flowInstanceRepository: Repository<FlowInstanceEntity>,
    @InjectRepository(FlowTemplateEntity)
    private readonly flowTemplateRepository: Repository<FlowTemplateEntity>,
    @InjectRepository(FlowVersionEntity)
    private readonly flowVersionRepository: Repository<FlowVersionEntity>,
    @InjectRepository(StepExecutionEntity)
    private readonly stepExecutionRepository: Repository<StepExecutionEntity>,
  ) {}

  /**
   * Start a new flow instance
   */
  async startFlowInstance(createDto: CreateFlowInstanceDto): Promise<FlowInstanceResponseDto> {
    // Verify template exists and is active
    const template = await this.flowTemplateRepository.findOne({
      where: {id: createDto.templateId, isActive: true},
    });

    if (!template) {
      throw new NotFoundException(`Flow template with ID "${ createDto.templateId }" not found`);
    }

    // Verify version exists and is published
    const version = await this.flowVersionRepository.findOne({
      where: {
        templateId: createDto.templateId,
        version: createDto.version,
        status: FlowVersionStatus.PUBLISHED,
      },
      relations: [ 'steps' ],
    });

    if (!version) {
      throw new NotFoundException(
        `Published version ${ createDto.version } not found for template "${ createDto.templateId }"`
      );
    }

    if (!version.steps || version.steps.length === 0) {
      throw new BadRequestException('Flow version has no steps defined');
    }

    // Create flow instance
    const instance = new FlowInstanceEntity();
    instance.templateId = createDto.templateId;
    instance.version = createDto.version;
    instance.status = FlowInstanceStatus.ACTIVE;
    instance.startedBy = createDto.startedBy;
    instance.startedAt = new Date();
    instance.contextData = createDto.contextData || null;
    instance.metadata = createDto.metadata || null;

    const savedInstance = await this.flowInstanceRepository.save(instance);

    // Create step executions for all steps
    const stepExecutions = version.steps
      .sort((a, b) => a.order - b.order)
      .map((step, index) => {
        const stepExecution = new StepExecutionEntity();
        stepExecution.instanceId = savedInstance.id;
        stepExecution.stepId = step.id;
        stepExecution.status = index === 0 ? StepExecutionStatus.PENDING : StepExecutionStatus.PENDING;
        return stepExecution;
      });

    await this.stepExecutionRepository.save(stepExecutions);

    return this.mapToResponseDto(savedInstance, template);
  }

  /**
   * Find flow instances with filters and pagination
   */
  async findFlowInstances(
    filters: { templateId?: string; status?: string; startedBy?: string },
    pagination: { page: number; limit: number }
  ): Promise<{
    instances: FlowInstanceResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.flowInstanceRepository.createQueryBuilder('instance')
      .leftJoinAndSelect('instance.template', 'template')
      .leftJoinAndSelect('instance.stepExecutions', 'stepExecutions');

    if (filters.templateId) {
      queryBuilder.andWhere('instance.templateId = :templateId', {templateId: filters.templateId});
    }

    if (filters.status) {
      queryBuilder.andWhere('instance.status = :status', {status: filters.status});
    }

    if (filters.startedBy) {
      queryBuilder.andWhere('instance.startedBy = :startedBy', {startedBy: filters.startedBy});
    }

    const total = await queryBuilder.getCount();

    const instances = await queryBuilder
      .orderBy('instance.startedAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getMany();

    const responseDtos = instances.map(instance => this.mapToResponseDto(instance));

    return {
      instances: responseDtos,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Find flow instance by ID
   */
  async findFlowInstanceById(id: string): Promise<FlowInstanceResponseDto> {
    const instance = await this.flowInstanceRepository.findOne({
      where: {id},
      relations: [ 'template', 'stepExecutions', 'stepExecutions.step' ],
    });

    if (!instance) {
      throw new NotFoundException(`Flow instance with ID "${ id }" not found`);
    }

    return this.mapToResponseDto(instance);
  }

  /**
   * Cancel a flow instance
   */
  async cancelFlowInstance(id: string, cancelledBy: string, reason: string): Promise<FlowInstanceResponseDto> {
    const instance = await this.flowInstanceRepository.findOne({
      where: {id},
      relations: [ 'template', 'stepExecutions' ],
    });

    if (!instance) {
      throw new NotFoundException(`Flow instance with ID "${ id }" not found`);
    }

    if (instance.status !== FlowInstanceStatus.ACTIVE) {
      throw new BadRequestException('Only active flow instances can be cancelled');
    }

    // Update instance status
    instance.status = FlowInstanceStatus.CANCELLED;
    instance.finishedAt = new Date();
    instance.finishedBy = cancelledBy;
    instance.cancellationReason = reason;

    // Cancel all pending and in-progress step executions
    if (instance.stepExecutions) {
      const activeStepExecutions = instance.stepExecutions.filter(
        se => se.status === StepExecutionStatus.PENDING || se.status === StepExecutionStatus.IN_PROGRESS
      );

      for (const stepExecution of activeStepExecutions) {
        stepExecution.status = StepExecutionStatus.SKIPPED;
        stepExecution.finishedAt = new Date();
        stepExecution.completionNotes = `Cancelled due to flow cancellation: ${ reason }`;
      }

      await this.stepExecutionRepository.save(activeStepExecutions);
    }

    const savedInstance = await this.flowInstanceRepository.save(instance);
    return this.mapToResponseDto(savedInstance);
  }

  /**
   * Resume a flow instance
   */
  async resumeFlowInstance(id: string, resumedBy: string, notes?: string): Promise<FlowInstanceResponseDto> {
    const instance = await this.flowInstanceRepository.findOne({
      where: {id},
      relations: [ 'template', 'stepExecutions' ],
    });

    if (!instance) {
      throw new NotFoundException(`Flow instance with ID "${ id }" not found`);
    }

    if (instance.status !== FlowInstanceStatus.ACTIVE) {
      throw new BadRequestException('Only active flow instances can be resumed');
    }

    // For now, resuming just updates metadata
    // In a more complex implementation, this could handle paused states
    if (!instance.metadata) {
      instance.metadata = {};
    }
    instance.metadata.lastResumedBy = resumedBy;
    instance.metadata.lastResumedAt = new Date().toISOString();
    if (notes) {
      instance.metadata.resumeNotes = notes;
    }

    const savedInstance = await this.flowInstanceRepository.save(instance);
    return this.mapToResponseDto(savedInstance);
  }

  /**
   * Get flow instance progress
   */
  async getFlowInstanceProgress(id: string): Promise<{
    instanceId: string;
    overallProgress: number;
    currentStep: any;
    completedSteps: any[];
    pendingSteps: any[];
    estimatedCompletion?: string;
  }> {
    const instance = await this.flowInstanceRepository.findOne({
      where: {id},
      relations: [ 'stepExecutions', 'stepExecutions.step' ],
    });

    if (!instance) {
      throw new NotFoundException(`Flow instance with ID "${ id }" not found`);
    }

    const stepExecutions = instance.stepExecutions || [];
    const totalSteps = stepExecutions.length;
    const completedSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.DONE);
    const pendingSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.PENDING);
    const currentStep = stepExecutions.find(se => se.status === StepExecutionStatus.IN_PROGRESS);

    const overallProgress = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0;

    return {
      instanceId: id,
      overallProgress: Math.round(overallProgress * 100) / 100,
      currentStep: currentStep ? {
        id: currentStep.id,
        stepId: currentStep.stepId,
        stepName: currentStep.step?.name,
        startedAt: currentStep.startedAt,
      } : null,
      completedSteps: completedSteps.map(se => ({
        id: se.id,
        stepId: se.stepId,
        stepName: se.step?.name,
        completedAt: se.finishedAt,
        actorId: se.actorId,
      })),
      pendingSteps: pendingSteps.map(se => ({
        id: se.id,
        stepId: se.stepId,
        stepName: se.step?.name,
        order: se.step?.order,
      })),
      // Simple estimation based on average time per completed step
      estimatedCompletion: this.calculateEstimatedCompletion(instance, completedSteps, pendingSteps),
    };
  }

  /**
   * Get flow instance history
   */
  async getFlowInstanceHistory(id: string): Promise<{
    instanceId: string;
    events: any[];
    timeline: any[];
    statistics: any;
  }> {
    const instance = await this.flowInstanceRepository.findOne({
      where: {id},
      relations: [ 'stepExecutions', 'stepExecutions.step' ],
    });

    if (!instance) {
      throw new NotFoundException(`Flow instance with ID "${ id }" not found`);
    }

    const events: any[] = [
      {
        type: 'FLOW_STARTED',
        timestamp: instance.startedAt,
        actorId: instance.startedBy,
        data: {templateId: instance.templateId, version: instance.version},
      },
    ];

    if (instance.stepExecutions) {
      for (const stepExecution of instance.stepExecutions) {
        if (stepExecution.startedAt) {
          events.push({
            type: 'STEP_STARTED',
            timestamp: stepExecution.startedAt,
            actorId: stepExecution.actorId,
            data: {stepId: stepExecution.stepId, stepName: stepExecution.step?.name},
          });
        }

        if (stepExecution.finishedAt) {
          events.push({
            type: 'STEP_COMPLETED',
            timestamp: stepExecution.finishedAt,
            actorId: stepExecution.actorId,
            data: {
              stepId: stepExecution.stepId,
              stepName: stepExecution.step?.name,
              status: stepExecution.status,
            },
          });
        }
      }
    }

    if (instance.finishedAt) {
      events.push({
        type: instance.status === FlowInstanceStatus.CANCELLED ? 'FLOW_CANCELLED' : 'FLOW_COMPLETED',
        timestamp: instance.finishedAt,
        actorId: instance.finishedBy,
        data: {reason: instance.cancellationReason},
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const timeline = events.map(event => ({
      ...event,
      relativeTime: this.calculateRelativeTime(instance.startedAt, event.timestamp),
    }));

    const statistics = this.calculateInstanceStatistics(instance);

    return {
      instanceId: id,
      events,
      timeline,
      statistics,
    };
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(
    instance: FlowInstanceEntity,
    completedSteps: StepExecutionEntity[],
    pendingSteps: StepExecutionEntity[]
  ): string | undefined {
    if (completedSteps.length === 0 || pendingSteps.length === 0) {
      return undefined;
    }

    // Calculate average time per completed step
    const totalCompletedTime = completedSteps.reduce((sum, step) => {
      if (step.startedAt && step.finishedAt) {
        return sum + (step.finishedAt.getTime() - step.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averageStepTime = totalCompletedTime / completedSteps.length;
    const estimatedRemainingTime = averageStepTime * pendingSteps.length;
    const estimatedCompletion = new Date(Date.now() + estimatedRemainingTime);

    return estimatedCompletion.toISOString();
  }

  /**
   * Calculate relative time from flow start
   */
  private calculateRelativeTime(startTime: Date, eventTime: Date): number {
    return eventTime.getTime() - startTime.getTime();
  }

  /**
   * Calculate instance statistics
   */
  private calculateInstanceStatistics(instance: FlowInstanceEntity): any {
    const stepExecutions = instance.stepExecutions || [];
    const totalSteps = stepExecutions.length;
    const completedSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.DONE);
    const skippedSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.SKIPPED);

    const totalExecutionTime = instance.finishedAt
      ? instance.finishedAt.getTime() - instance.startedAt.getTime()
      : Date.now() - instance.startedAt.getTime();

    return {
      totalSteps,
      completedSteps: completedSteps.length,
      skippedSteps: skippedSteps.length,
      completionRate: totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0,
      totalExecutionTimeMs: totalExecutionTime,
      averageStepTime: completedSteps.length > 0
        ? totalExecutionTime / completedSteps.length
        : 0,
      isCompleted: instance.status !== FlowInstanceStatus.ACTIVE,
    };
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(
    instance: FlowInstanceEntity,
    template?: FlowTemplateEntity
  ): FlowInstanceResponseDto {
    const dto = new FlowInstanceResponseDto();
    dto.id = instance.id;
    dto.templateId = instance.templateId;
    dto.version = instance.version;
    dto.status = instance.status;
    dto.startedBy = instance.startedBy;
    dto.startedAt = instance.startedAt;
    dto.finishedAt = instance.finishedAt;
    dto.finishedBy = instance.finishedBy;
    dto.cancellationReason = instance.cancellationReason;
    dto.contextData = instance.contextData;
    dto.metadata = instance.metadata;
    dto.createdAt = instance.createdAt;
    dto.updatedAt = instance.updatedAt;

    // Add computed fields
    if (template) {
      dto.templateName = template.name;
    }

    if (instance.stepExecutions) {
      const stepExecutions = instance.stepExecutions;
      dto.totalSteps = stepExecutions.length;
      dto.completedSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.DONE).length;
      dto.pendingSteps = stepExecutions.filter(se => se.status === StepExecutionStatus.PENDING).length;

      if (dto.totalSteps > 0) {
        dto.progressPercentage = Math.round((dto.completedSteps / dto.totalSteps) * 100);
      }

      const currentStep = stepExecutions.find(se => se.status === StepExecutionStatus.IN_PROGRESS);
      if (currentStep && currentStep.step) {
        dto.currentStep = {
          id: currentStep.stepId,
          key: currentStep.step.key,
          name: currentStep.step.name,
        };
      }
    }

    if (instance.finishedAt) {
      dto.executionTimeSeconds = Math.round(
        (instance.finishedAt.getTime() - instance.startedAt.getTime()) / 1000
      );
    }

    dto.canCancel = instance.status === FlowInstanceStatus.ACTIVE;
    dto.canResume = instance.status === FlowInstanceStatus.ACTIVE;

    return dto;
  }
}
