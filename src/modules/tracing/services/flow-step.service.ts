import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                                      from '@nestjs/typeorm';
import { Repository }                                                            from 'typeorm';
import { FlowStepEntity }                                                        from '../domain/entities/flow-step.entity';
import { FlowVersionEntity }                                                     from '../domain/entities/flow-version.entity';
import { CreateFlowStepDto }                                                     from '../domain/dto/create-flow-step.dto';
import { UpdateFlowStepDto }                                                     from '../domain/dto/update-flow-step.dto';
import { FlowStepResponseDto }                                                   from '../domain/dto/flow-step-response.dto';
import { FlowVersionStatus }                                                     from '../domain/enums/flow-version-status.enum';

/**
 * Service for managing flow steps
 * Handles CRUD operations and business logic for flow steps
 */
@Injectable()
export class FlowStepService {
  constructor(
    @InjectRepository(FlowStepEntity)
    private readonly flowStepRepository: Repository<FlowStepEntity>,
    @InjectRepository(FlowVersionEntity)
    private readonly flowVersionRepository: Repository<FlowVersionEntity>,
  ) {}

  /**
   * Create a new flow step
   */
  async createFlowStep(createDto: CreateFlowStepDto): Promise<FlowStepResponseDto> {
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

    // Check if step key is unique within the version
    const existingStep = await this.flowStepRepository.findOne({
      where: {
        flowVersionId: createDto.flowVersionId,
        key: createDto.key,
      },
    });

    if (existingStep) {
      throw new ConflictException(`Step with key "${ createDto.key }" already exists in this version`);
    }

    // Get next order if not provided
    let order = createDto.order ?? 0;
    if (order === 0) {
      const lastStep = await this.flowStepRepository.findOne({
        where: {flowVersionId: createDto.flowVersionId},
        order: {order: 'DESC'},
      });
      order = lastStep ? lastStep.order + 1 : 1;
    }

    const step = new FlowStepEntity();
    step.flowVersionId = createDto.flowVersionId;
    step.key = createDto.key;
    step.name = createDto.name;
    step.type = createDto.type;
    step.position = createDto.position || null;
    step.order = order;
    step.description = createDto.description || null;
    step.configJson = createDto.configJson || null;
    step.isActive = createDto.isActive ?? true;

    const savedStep = await this.flowStepRepository.save(step);
    return this.mapToResponseDto(savedStep, version);
  }

  /**
   * Get all steps for a flow version
   */
  async findStepsByVersion(versionId: string): Promise<FlowStepResponseDto[]> {
    const version = await this.flowVersionRepository.findOne({
      where: {id: versionId},
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ versionId }" not found`);
    }

    const steps = await this.flowStepRepository.find({
      where: {flowVersionId: versionId},
      relations: [ 'fields', 'executions' ],
      order: {order: 'ASC'},
    });

    return steps.map(step => this.mapToResponseDto(step, version));
  }

  /**
   * Get a flow step by ID
   */
  async findStepById(id: string): Promise<FlowStepResponseDto> {
    const step = await this.flowStepRepository.findOne({
      where: {id},
      relations: [ 'flowVersion', 'fields', 'executions' ],
    });

    if (!step) {
      throw new NotFoundException(`Flow step with ID "${ id }" not found`);
    }

    return this.mapToResponseDto(step, step.flowVersion);
  }

  /**
   * Update a flow step
   */
  async updateFlowStep(id: string, updateDto: UpdateFlowStepDto): Promise<FlowStepResponseDto> {
    const step = await this.flowStepRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!step) {
      throw new NotFoundException(`Flow step with ID "${ id }" not found`);
    }

    if (step.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only steps in DRAFT versions can be modified');
    }

    // Check key uniqueness if key is being updated
    if (updateDto.key && updateDto.key !== step.key) {
      const existingStep = await this.flowStepRepository.findOne({
        where: {
          flowVersionId: step.flowVersionId,
          key: updateDto.key,
        },
      });

      if (existingStep && existingStep.id !== id) {
        throw new ConflictException(`Step with key "${ updateDto.key }" already exists in this version`);
      }
    }

    // Update fields
    Object.assign(step, updateDto);
    const savedStep = await this.flowStepRepository.save(step);
    return this.mapToResponseDto(savedStep, step.flowVersion);
  }

  /**
   * Delete a flow step
   */
  async deleteFlowStep(id: string): Promise<void> {
    const step = await this.flowStepRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!step) {
      throw new NotFoundException(`Flow step with ID "${ id }" not found`);
    }

    if (step.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only steps in DRAFT versions can be deleted');
    }

    await this.flowStepRepository.remove(step);
  }

  /**
   * Reorder steps within a version
   */
  async reorderSteps(versionId: string, stepIds: string[]): Promise<FlowStepResponseDto[]> {
    const version = await this.flowVersionRepository.findOne({
      where: {id: versionId},
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ versionId }" not found`);
    }

    if (version.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be modified');
    }

    // Get all steps for the version
    const steps = await this.flowStepRepository.find({
      where: {flowVersionId: versionId},
    });

    // Validate that all provided step IDs exist and belong to this version
    const stepMap = new Map(steps.map(step => [ step.id, step ]));
    for (const stepId of stepIds) {
      if (!stepMap.has(stepId)) {
        throw new BadRequestException(`Step with ID "${ stepId }" not found in this version`);
      }
    }

    // Update order for each step
    const updatedSteps: FlowStepEntity[] = [];
    for (let i = 0; i < stepIds.length; i++) {
      const step = stepMap.get(stepIds[i])!;
      step.order = i + 1;
      updatedSteps.push(step);
    }

    await this.flowStepRepository.save(updatedSteps);

    // Return updated steps in new order
    const reorderedSteps = await this.flowStepRepository.find({
      where: {flowVersionId: versionId},
      relations: [ 'fields', 'executions' ],
      order: {order: 'ASC'},
    });

    return reorderedSteps.map(step => this.mapToResponseDto(step, version));
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(step: FlowStepEntity, version?: FlowVersionEntity): FlowStepResponseDto {
    const dto = new FlowStepResponseDto();
    dto.id = step.id;
    dto.flowVersionId = step.flowVersionId;
    dto.key = step.key;
    dto.name = step.name;
    dto.type = step.type;
    dto.position = step.position;
    dto.order = step.order;
    dto.description = step.description;
    dto.configJson = step.configJson;
    dto.isActive = step.isActive;
    dto.createdAt = step.createdAt;
    dto.updatedAt = step.updatedAt;

    // Add computed fields if relations are loaded
    if (step.fields) {
      dto.fieldsCount = step.fields.length;
    }

    if (step.executions) {
      dto.executionsCount = step.executions.length;
    }

    if (version) {
      dto.canEdit = version.status === FlowVersionStatus.DRAFT;
    }

    return dto;
  }
}
