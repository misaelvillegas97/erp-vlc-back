import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                                      from '@nestjs/typeorm';
import { Repository }                                                            from 'typeorm';
import { FieldCategoryEntity }                                                   from '../domain/entities/field-category.entity';
import { FieldDefEntity }                                                        from '../domain/entities/field-def.entity';
import { FlowVersionEntity }                                                     from '../domain/entities/flow-version.entity';
import { FlowStepEntity }                                                        from '../domain/entities/flow-step.entity';
import { CreateFieldCategoryDto }                                                from '../domain/dto/create-field-category.dto';
import { UpdateFieldCategoryDto }                                                from '../domain/dto/update-field-category.dto';
import { FieldCategoryResponseDto }                                              from '../domain/dto/field-category-response.dto';
import { CreateFieldDefDto }                                                     from '../domain/dto/create-field-def.dto';
import { UpdateFieldDefDto }                                                     from '../domain/dto/update-field-def.dto';
import { FieldDefResponseDto }                                                   from '../domain/dto/field-def-response.dto';
import { FlowVersionStatus }                                                     from '../domain/enums/flow-version-status.enum';

/**
 * Service for managing field categories and field definitions
 * Handles CRUD operations and business logic for dynamic fields
 */
@Injectable()
export class FieldService {
  constructor(
    @InjectRepository(FieldCategoryEntity)
    private readonly fieldCategoryRepository: Repository<FieldCategoryEntity>,
    @InjectRepository(FieldDefEntity)
    private readonly fieldDefRepository: Repository<FieldDefEntity>,
    @InjectRepository(FlowVersionEntity)
    private readonly flowVersionRepository: Repository<FlowVersionEntity>,
    @InjectRepository(FlowStepEntity)
    private readonly flowStepRepository: Repository<FlowStepEntity>,
  ) {}

  // ========== FIELD CATEGORIES ==========

  /**
   * Create a new field category
   */
  async createFieldCategory(createDto: CreateFieldCategoryDto): Promise<FieldCategoryResponseDto> {
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

    // Get next order if not provided
    let order = createDto.order ?? 0;
    if (order === 0) {
      const lastCategory = await this.fieldCategoryRepository.findOne({
        where: {flowVersionId: createDto.flowVersionId},
        order: {order: 'DESC'},
      });
      order = lastCategory ? lastCategory.order + 1 : 1;
    }

    const category = new FieldCategoryEntity();
    category.flowVersionId = createDto.flowVersionId;
    category.name = createDto.name;
    category.order = order;
    category.description = createDto.description || null;
    category.isActive = createDto.isActive ?? true;
    category.configJson = createDto.configJson || null;

    const savedCategory = await this.fieldCategoryRepository.save(category);
    return this.mapCategoryToResponseDto(savedCategory, version);
  }

  /**
   * Get all categories for a flow version
   */
  async findCategoriesByVersion(versionId: string): Promise<FieldCategoryResponseDto[]> {
    const version = await this.flowVersionRepository.findOne({
      where: {id: versionId},
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ versionId }" not found`);
    }

    const categories = await this.fieldCategoryRepository.find({
      where: {flowVersionId: versionId},
      relations: [ 'fields' ],
      order: {order: 'ASC'},
    });

    return categories.map(category => this.mapCategoryToResponseDto(category, version));
  }

  /**
   * Get a field category by ID
   */
  async findCategoryById(id: string): Promise<FieldCategoryResponseDto> {
    const category = await this.fieldCategoryRepository.findOne({
      where: {id},
      relations: [ 'flowVersion', 'fields' ],
    });

    if (!category) {
      throw new NotFoundException(`Field category with ID "${ id }" not found`);
    }

    return this.mapCategoryToResponseDto(category, category.flowVersion);
  }

  /**
   * Update a field category
   */
  async updateFieldCategory(id: string, updateDto: UpdateFieldCategoryDto): Promise<FieldCategoryResponseDto> {
    const category = await this.fieldCategoryRepository.findOne({
      where: {id},
      relations: [ 'flowVersion' ],
    });

    if (!category) {
      throw new NotFoundException(`Field category with ID "${ id }" not found`);
    }

    if (category.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only categories in DRAFT versions can be modified');
    }

    Object.assign(category, updateDto);
    const savedCategory = await this.fieldCategoryRepository.save(category);
    return this.mapCategoryToResponseDto(savedCategory, category.flowVersion);
  }

  /**
   * Delete a field category
   */
  async deleteFieldCategory(id: string): Promise<void> {
    const category = await this.fieldCategoryRepository.findOne({
      where: {id},
      relations: [ 'flowVersion', 'fields' ],
    });

    if (!category) {
      throw new NotFoundException(`Field category with ID "${ id }" not found`);
    }

    if (category.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only categories in DRAFT versions can be deleted');
    }

    if (category.fields && category.fields.length > 0) {
      throw new BadRequestException('Cannot delete category that contains fields');
    }

    await this.fieldCategoryRepository.remove(category);
  }

  // ========== FIELD DEFINITIONS ==========

  /**
   * Create a new field definition
   */
  async createFieldDef(createDto: CreateFieldDefDto): Promise<FieldDefResponseDto> {
    // Verify step exists and version is DRAFT
    const step = await this.flowStepRepository.findOne({
      where: {id: createDto.stepId},
      relations: [ 'flowVersion' ],
    });

    if (!step) {
      throw new NotFoundException(`Flow step with ID "${ createDto.stepId }" not found`);
    }

    if (step.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be modified');
    }

    // Verify category exists if provided
    if (createDto.categoryId) {
      const category = await this.fieldCategoryRepository.findOne({
        where: {
          id: createDto.categoryId,
          flowVersionId: step.flowVersionId
        },
      });

      if (!category) {
        throw new NotFoundException(`Field category with ID "${ createDto.categoryId }" not found in this version`);
      }
    }

    // Check if field key is unique within the step
    const existingField = await this.fieldDefRepository.findOne({
      where: {
        stepId: createDto.stepId,
        key: createDto.key,
      },
    });

    if (existingField) {
      throw new ConflictException(`Field with key "${ createDto.key }" already exists in this step`);
    }

    // Get next order if not provided
    let order = createDto.order ?? 0;
    if (order === 0) {
      const lastField = await this.fieldDefRepository.findOne({
        where: {stepId: createDto.stepId},
        order: {order: 'DESC'},
      });
      order = lastField ? lastField.order + 1 : 1;
    }

    const fieldDef = new FieldDefEntity();
    fieldDef.stepId = createDto.stepId;
    fieldDef.categoryId = createDto.categoryId || null;
    fieldDef.key = createDto.key;
    fieldDef.label = createDto.label;
    fieldDef.type = createDto.type;
    fieldDef.required = createDto.required ?? false;
    fieldDef.configJson = createDto.configJson || null;
    fieldDef.order = order;
    fieldDef.description = createDto.description || null;
    fieldDef.placeholder = createDto.placeholder || null;
    fieldDef.validationRules = createDto.validationRules || null;
    fieldDef.isActive = createDto.isActive ?? true;

    const savedFieldDef = await this.fieldDefRepository.save(fieldDef);
    return this.mapFieldDefToResponseDto(savedFieldDef, step.flowVersion);
  }

  /**
   * Get all field definitions for a step
   */
  async findFieldDefsByStep(stepId: string): Promise<FieldDefResponseDto[]> {
    const step = await this.flowStepRepository.findOne({
      where: {id: stepId},
      relations: [ 'flowVersion' ],
    });

    if (!step) {
      throw new NotFoundException(`Flow step with ID "${ stepId }" not found`);
    }

    const fieldDefs = await this.fieldDefRepository.find({
      where: {stepId},
      relations: [ 'category', 'values' ],
      order: {order: 'ASC'},
    });

    return fieldDefs.map(fieldDef => this.mapFieldDefToResponseDto(fieldDef, step.flowVersion));
  }

  /**
   * Get a field definition by ID
   */
  async findFieldDefById(id: string): Promise<FieldDefResponseDto> {
    const fieldDef = await this.fieldDefRepository.findOne({
      where: {id},
      relations: [ 'step', 'step.flowVersion', 'category', 'values' ],
    });

    if (!fieldDef) {
      throw new NotFoundException(`Field definition with ID "${ id }" not found`);
    }

    return this.mapFieldDefToResponseDto(fieldDef, fieldDef.step.flowVersion);
  }

  /**
   * Update a field definition
   */
  async updateFieldDef(id: string, updateDto: UpdateFieldDefDto): Promise<FieldDefResponseDto> {
    const fieldDef = await this.fieldDefRepository.findOne({
      where: {id},
      relations: [ 'step', 'step.flowVersion' ],
    });

    if (!fieldDef) {
      throw new NotFoundException(`Field definition with ID "${ id }" not found`);
    }

    if (fieldDef.step.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only field definitions in DRAFT versions can be modified');
    }

    // Verify category exists if being updated
    if (updateDto.categoryId && updateDto.categoryId !== fieldDef.categoryId) {
      const category = await this.fieldCategoryRepository.findOne({
        where: {
          id: updateDto.categoryId,
          flowVersionId: fieldDef.step.flowVersionId
        },
      });

      if (!category) {
        throw new NotFoundException(`Field category with ID "${ updateDto.categoryId }" not found in this version`);
      }
    }

    // Check key uniqueness if key is being updated
    if (updateDto.key && updateDto.key !== fieldDef.key) {
      const existingField = await this.fieldDefRepository.findOne({
        where: {
          stepId: fieldDef.stepId,
          key: updateDto.key,
        },
      });

      if (existingField && existingField.id !== id) {
        throw new ConflictException(`Field with key "${ updateDto.key }" already exists in this step`);
      }
    }

    Object.assign(fieldDef, updateDto);
    const savedFieldDef = await this.fieldDefRepository.save(fieldDef);
    return this.mapFieldDefToResponseDto(savedFieldDef, fieldDef.step.flowVersion);
  }

  /**
   * Delete a field definition
   */
  async deleteFieldDef(id: string): Promise<void> {
    const fieldDef = await this.fieldDefRepository.findOne({
      where: {id},
      relations: [ 'step', 'step.flowVersion' ],
    });

    if (!fieldDef) {
      throw new NotFoundException(`Field definition with ID "${ id }" not found`);
    }

    if (fieldDef.step.flowVersion.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only field definitions in DRAFT versions can be deleted');
    }

    await this.fieldDefRepository.remove(fieldDef);
  }

  // ========== MAPPING METHODS ==========

  /**
   * Map category entity to response DTO
   */
  private mapCategoryToResponseDto(category: FieldCategoryEntity, version?: FlowVersionEntity): FieldCategoryResponseDto {
    const dto = new FieldCategoryResponseDto();
    dto.id = category.id;
    dto.flowVersionId = category.flowVersionId;
    dto.name = category.name;
    dto.order = category.order;
    dto.description = category.description;
    dto.isActive = category.isActive;
    dto.configJson = category.configJson;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;

    if (category.fields) {
      dto.fieldsCount = category.fields.length;
    }

    if (version) {
      dto.canEdit = version.status === FlowVersionStatus.DRAFT;
    }

    return dto;
  }

  /**
   * Map field definition entity to response DTO
   */
  private mapFieldDefToResponseDto(fieldDef: FieldDefEntity, version?: FlowVersionEntity): FieldDefResponseDto {
    const dto = new FieldDefResponseDto();
    dto.id = fieldDef.id;
    dto.stepId = fieldDef.stepId;
    dto.categoryId = fieldDef.categoryId;
    dto.key = fieldDef.key;
    dto.label = fieldDef.label;
    dto.type = fieldDef.type;
    dto.required = fieldDef.required;
    dto.configJson = fieldDef.configJson;
    dto.order = fieldDef.order;
    dto.description = fieldDef.description;
    dto.placeholder = fieldDef.placeholder;
    dto.validationRules = fieldDef.validationRules;
    dto.isActive = fieldDef.isActive;
    dto.createdAt = fieldDef.createdAt;
    dto.updatedAt = fieldDef.updatedAt;

    if (fieldDef.category) {
      dto.categoryName = fieldDef.category.name;
    }

    if (fieldDef.values) {
      dto.valuesCount = fieldDef.values.length;
    }

    if (version) {
      dto.canEdit = version.status === FlowVersionStatus.DRAFT;
    }

    return dto;
  }
}
