import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                 from '@nestjs/typeorm';
import { Repository }                                       from 'typeorm';
import { FlowTemplateEntity }                               from '../domain/entities/flow-template.entity';
import { CreateFlowTemplateDto }                            from '../domain/dto/create-flow-template.dto';
import { FlowTemplateResponseDto }                          from '../domain/dto/flow-template-response.dto';

/**
 * Service for managing flow templates
 * Handles CRUD operations and business logic for flow templates
 */
@Injectable()
export class FlowTemplateService {
  constructor(
    @InjectRepository(FlowTemplateEntity)
    private readonly flowTemplateRepository: Repository<FlowTemplateEntity>,
  ) {}

  /**
   * Create a new flow template
   */
  async createFlowTemplate(createDto: CreateFlowTemplateDto): Promise<FlowTemplateResponseDto> {
    // Check if template with same name already exists
    const existingTemplate = await this.flowTemplateRepository.findOne({
      where: {
        name: createDto.name,
        isActive: true,
      },
    });

    if (existingTemplate) {
      throw new ConflictException(`Flow template with name "${ createDto.name }" already exists`);
    }

    const template = new FlowTemplateEntity();
    template.name = createDto.name;
    template.description = createDto.description;
    template.isActive = true;

    const savedTemplate = await this.flowTemplateRepository.save(template);
    return this.mapToResponseDto(savedTemplate);
  }

  /**
   * Get all flow templates with optional filters
   */
  async findAllFlowTemplates(filters?: {
    name?: string;
    isActive?: boolean;
  }): Promise<FlowTemplateResponseDto[]> {
    const queryBuilder = this.flowTemplateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.versions', 'versions')
      .leftJoinAndSelect('template.instances', 'instances');

    if (filters?.name) {
      queryBuilder.andWhere('template.name ILIKE :name', {name: `%${ filters.name }%`});
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {isActive: filters.isActive});
    }

    queryBuilder.orderBy('template.createdAt', 'DESC');

    const templates = await queryBuilder.getMany();
    return templates.map(template => this.mapToResponseDto(template));
  }

  /**
   * Get a flow template by ID
   */
  async findFlowTemplateById(id: string): Promise<FlowTemplateResponseDto> {
    const template = await this.flowTemplateRepository.findOne({
      where: {id},
      relations: [ 'versions', 'instances' ],
    });

    if (!template) {
      throw new NotFoundException(`Flow template with ID "${ id }" not found`);
    }

    return this.mapToResponseDto(template);
  }

  /**
   * Update a flow template
   */
  async updateFlowTemplate(
    id: string,
    updateData: Partial<Pick<CreateFlowTemplateDto, 'name' | 'description'>>
  ): Promise<FlowTemplateResponseDto> {
    const template = await this.flowTemplateRepository.findOne({where: {id}});

    if (!template) {
      throw new NotFoundException(`Flow template with ID "${ id }" not found`);
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== template.name) {
      const existingTemplate = await this.flowTemplateRepository.findOne({
        where: {
          name: updateData.name,
          isActive: true,
        },
      });

      if (existingTemplate && existingTemplate.id !== id) {
        throw new ConflictException(`Flow template with name "${ updateData.name }" already exists`);
      }
    }

    Object.assign(template, updateData);
    const savedTemplate = await this.flowTemplateRepository.save(template);
    return this.mapToResponseDto(savedTemplate);
  }

  /**
   * Soft delete a flow template
   */
  async deleteFlowTemplate(id: string): Promise<void> {
    const template = await this.flowTemplateRepository.findOne({where: {id}});

    if (!template) {
      throw new NotFoundException(`Flow template with ID "${ id }" not found`);
    }

    template.isActive = false;
    await this.flowTemplateRepository.save(template);
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(template: FlowTemplateEntity): FlowTemplateResponseDto {
    const dto = new FlowTemplateResponseDto();
    dto.id = template.id;
    dto.name = template.name;
    dto.description = template.description;
    dto.isActive = template.isActive;
    dto.createdAt = template.createdAt;
    dto.updatedAt = template.updatedAt;

    // Add computed fields if relations are loaded
    if (template.versions) {
      dto.versionsCount = template.versions.length;
      const publishedVersions = template.versions
        .filter(v => v.status === 'PUBLISHED')
        .sort((a, b) => b.version - a.version);
      dto.latestPublishedVersion = publishedVersions[0]?.version;
    }

    if (template.instances) {
      dto.activeInstancesCount = template.instances.filter(i => i.status === 'ACTIVE').length;
    }

    return dto;
  }
}
