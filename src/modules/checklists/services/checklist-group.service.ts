import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { ChecklistGroupEntity }                               from '../domain/entities/checklist-group.entity';
import { ChecklistTemplateEntity }                            from '../domain/entities/checklist-template.entity';
import { CreateChecklistGroupDto }                            from '../domain/dto/create-checklist-group.dto';
import { UpdateChecklistGroupDto }                            from '../domain/dto/update-checklist-group.dto';
import { QueryChecklistGroupDto }                             from '../domain/dto/query-checklist-group.dto';

@Injectable()
export class ChecklistGroupService {
  constructor(
    @InjectRepository(ChecklistGroupEntity)
    private readonly groupRepository: Repository<ChecklistGroupEntity>,
    @InjectRepository(ChecklistTemplateEntity)
    private readonly templateRepository: Repository<ChecklistTemplateEntity>,
  ) {}

  /**
   * Creates a new checklist group with template associations and weight validation
   *
   * @param dto - The data transfer object containing group creation details
   * @returns Promise resolving to the created checklist group entity
   * @throws BadRequestException when template weights don't sum to 1.0 or templates don't exist
   *
   * @example
   * ```typescript
   * const group = await service.createGroup({
   *   name: 'Vehicle Safety Group',
   *   templateIds: ['template-1', 'template-2'],
   *   templateWeights: { 'template-1': 0.6, 'template-2': 0.4 }
   * });
   * ```
   */
  async createGroup(dto: CreateChecklistGroupDto): Promise<ChecklistGroupEntity> {
    await this.validateTemplateIds(dto.templateIds);
    this.validateTemplateWeights(dto.templateIds, dto.templateWeights);

    const group = this.groupRepository.create({
      name: dto.name,
      description: dto.description,
      weight: dto.weight || 1.0,
      vehicleTypes: dto.vehicleTypes,
      userRoles: dto.userRoles,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      performanceThreshold: dto.performanceThreshold || 70.0,
      templateWeights: dto.templateWeights,
    });

    const savedGroup = await this.groupRepository.save(group);

    if (dto.templateIds && dto.templateIds.length > 0) {
      const templates = await this.templateRepository.findByIds(dto.templateIds);
      savedGroup.templates = templates;
      await this.groupRepository.save(savedGroup);
    }

    return this.findById(savedGroup.id);
  }

  /**
   * Retrieves a checklist group by its unique identifier with all related entities
   *
   * @param id - The unique identifier of the checklist group
   * @returns Promise resolving to the checklist group entity with templates, categories, and executions
   * @throws NotFoundException when the group with the specified ID doesn't exist
   *
   * @example
   * ```typescript
   * const group = await service.findById('123e4567-e89b-12d3-a456-426614174000');
   * console.log(group.templates.length); // Access related templates
   * ```
   */
  async findById(id: string): Promise<ChecklistGroupEntity> {
    const group = await this.groupRepository.findOne({
      where: {id},
      relations: [ 'templates', 'categories', 'executions' ]
    });

    if (!group) {
      throw new NotFoundException(`Checklist group with ID ${ id } not found`);
    }

    return group;
  }

  /**
   * Retrieves all checklist groups with advanced filtering, pagination, and sorting capabilities
   *
   * @param query - Query parameters for filtering, pagination, and sorting
   * @returns Promise resolving to a tuple containing the array of groups and total count
   *
   * @example
   * ```typescript
   * const [groups, total] = await service.findAll({
   *   isActive: true,
   *   vehicleType: 'TRUCK',
   *   page: 1,
   *   limit: 10,
   *   includeTemplates: true
   * });
   * ```
   */
  async findAll(query: QueryChecklistGroupDto): Promise<[ ChecklistGroupEntity[], number ]> {
    const queryBuilder = this.groupRepository.createQueryBuilder('group');

    if (query.includeTemplates) {
      queryBuilder.leftJoinAndSelect('group.templates', 'templates');
    }

    if (query.includeCategories) {
      queryBuilder.leftJoinAndSelect('group.categories', 'categories');
    }

    if (query.name) {
      queryBuilder.andWhere('group.name ILIKE :name', {name: `%${ query.name }%`});
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('group.isActive = :isActive', {isActive: query.isActive});
    }

    if (query.vehicleType) {
      queryBuilder.andWhere(':vehicleType = ANY(group.vehicleTypes)', {vehicleType: query.vehicleType});
    }

    if (query.userRole) {
      queryBuilder.andWhere(':userRole = ANY(group.userRoles)', {userRole: query.userRole});
    }

    if (query.templateId) {
      queryBuilder.innerJoin('group.templates', 'template', 'template.id = :templateId', {templateId: query.templateId});
    }

    if (query.minPerformanceThreshold !== undefined) {
      queryBuilder.andWhere('group.performanceThreshold >= :minThreshold', {minThreshold: query.minPerformanceThreshold});
    }

    if (query.maxPerformanceThreshold !== undefined) {
      queryBuilder.andWhere('group.performanceThreshold <= :maxThreshold', {maxThreshold: query.maxPerformanceThreshold});
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`group.${ sortBy }`, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Update an existing checklist group
   */
  async updateGroup(id: string, dto: UpdateChecklistGroupDto): Promise<ChecklistGroupEntity> {
    const existingGroup = await this.findById(id);

    if (dto.templateIds) {
      await this.validateTemplateIds(dto.templateIds);
      this.validateTemplateWeights(dto.templateIds, dto.templateWeights);
    }

    // Update basic fields
    if (dto.name !== undefined) existingGroup.name = dto.name;
    if (dto.description !== undefined) existingGroup.description = dto.description;
    if (dto.weight !== undefined) existingGroup.weight = dto.weight;
    if (dto.vehicleTypes !== undefined) existingGroup.vehicleTypes = dto.vehicleTypes;
    if (dto.userRoles !== undefined) existingGroup.userRoles = dto.userRoles;
    if (dto.isActive !== undefined) existingGroup.isActive = dto.isActive;
    if (dto.performanceThreshold !== undefined) existingGroup.performanceThreshold = dto.performanceThreshold;
    if (dto.templateWeights !== undefined) existingGroup.templateWeights = dto.templateWeights;

    const updatedGroup = await this.groupRepository.save(existingGroup);

    // Update template relationships if provided
    if (dto.templateIds !== undefined) {
      if (dto.templateIds.length > 0) {
        const templates = await this.templateRepository.findByIds(dto.templateIds);
        updatedGroup.templates = templates;
      } else {
        updatedGroup.templates = [];
      }
      await this.groupRepository.save(updatedGroup);
    }

    return this.findById(updatedGroup.id);
  }

  /**
   * Delete a checklist group
   */
  async deleteGroup(id: string): Promise<void> {
    const group = await this.findById(id);

    // Check if group has any executions
    if (group.executions && group.executions.length > 0) {
      throw new BadRequestException('Cannot delete group with existing executions');
    }

    await this.groupRepository.remove(group);
  }

  /**
   * Soft delete a checklist group (set as inactive)
   */
  async deactivateGroup(id: string): Promise<ChecklistGroupEntity> {
    const group = await this.findById(id);
    group.isActive = false;
    await this.groupRepository.save(group);
    return group;
  }

  private async validateTemplateIds(templateIds?: string[]): Promise<void> {
    if (!templateIds || templateIds.length === 0) {
      return;
    }

    const existingTemplates = await this.templateRepository.findByIds(templateIds);
    const existingIds = existingTemplates.map(t => t.id);
    const missingIds = templateIds.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(`Templates not found: ${ missingIds.join(', ') }`);
    }
  }

  private validateTemplateWeights(templateIds?: string[], templateWeights?: Record<string, number>): void {
    if (!templateIds || templateIds.length === 0) {
      return;
    }

    if (!templateWeights) {
      throw new BadRequestException('Template weights must be provided when templates are specified');
    }

    const weightKeys = Object.keys(templateWeights);
    const missingWeights = templateIds.filter(id => !weightKeys.includes(id));
    const extraWeights = weightKeys.filter(id => !templateIds.includes(id));

    if (missingWeights.length > 0) {
      throw new BadRequestException(`Missing weights for templates: ${ missingWeights.join(', ') }`);
    }

    if (extraWeights.length > 0) {
      throw new BadRequestException(`Extra weights for non-existent templates: ${ extraWeights.join(', ') }`);
    }
  }
}
