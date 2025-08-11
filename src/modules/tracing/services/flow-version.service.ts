import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { FlowVersionEntity }                                  from '../domain/entities/flow-version.entity';
import { FlowTemplateEntity }                                 from '../domain/entities/flow-template.entity';
import { CreateFlowVersionDto }                               from '../domain/dto/create-flow-version.dto';
import { FlowVersionResponseDto }                             from '../domain/dto/flow-version-response.dto';
import { FlowVersionStatus }                                  from '../domain/enums/flow-version-status.enum';

/**
 * Service for managing flow versions
 * Handles versioning, cloning, and publication logic
 */
@Injectable()
export class FlowVersionService {
  constructor(
    @InjectRepository(FlowVersionEntity)
    private readonly flowVersionRepository: Repository<FlowVersionEntity>,
    @InjectRepository(FlowTemplateEntity)
    private readonly flowTemplateRepository: Repository<FlowTemplateEntity>,
  ) {}

  /**
   * Create a new flow version
   */
  async createFlowVersion(createDto: CreateFlowVersionDto): Promise<FlowVersionResponseDto> {
    // Verify template exists
    const template = await this.flowTemplateRepository.findOne({
      where: {id: createDto.templateId, isActive: true},
    });

    if (!template) {
      throw new NotFoundException(`Flow template with ID "${ createDto.templateId }" not found`);
    }

    // Get next version number
    const latestVersion = await this.flowVersionRepository.findOne({
      where: {templateId: createDto.templateId},
      order: {version: 'DESC'},
    });

    const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // If cloning from existing version, verify it exists
    if (createDto.fromVersion) {
      const sourceVersion = await this.flowVersionRepository.findOne({
        where: {
          templateId: createDto.templateId,
          version: createDto.fromVersion,
        },
        relations: [ 'steps', 'categories', 'terminationRules' ],
      });

      if (!sourceVersion) {
        throw new NotFoundException(
          `Source version ${ createDto.fromVersion } not found for template "${ createDto.templateId }"`
        );
      }

      // TODO: Implement cloning logic in future iterations
      // This would involve deep copying steps, categories, fields, and rules
    }

    const version = this.flowVersionRepository.create({
      templateId: createDto.templateId,
      version: nextVersionNumber,
      status: FlowVersionStatus.DRAFT,
      notes: createDto.notes,
      publishedAt: null,
      schemaHash: null,
      publishedBy: null,
    });

    const savedVersion = await this.flowVersionRepository.save(version);
    return this.mapToResponseDto(savedVersion);
  }

  /**
   * Get all versions for a template
   */
  async findVersionsByTemplate(templateId: string): Promise<FlowVersionResponseDto[]> {
    const versions = await this.flowVersionRepository.find({
      where: {templateId},
      relations: [ 'steps', 'categories', 'terminationRules' ],
      order: {version: 'DESC'},
    });

    return versions.map(version => this.mapToResponseDto(version));
  }

  /**
   * Get a specific version by ID
   */
  async findVersionById(id: string): Promise<FlowVersionResponseDto> {
    const version = await this.flowVersionRepository.findOne({
      where: {id},
      relations: [ 'template', 'steps', 'categories', 'terminationRules' ],
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ id }" not found`);
    }

    return this.mapToResponseDto(version);
  }

  /**
   * Update a flow version (only if DRAFT)
   */
  async updateFlowVersion(
    id: string,
    updateData: Partial<Pick<CreateFlowVersionDto, 'notes'>>
  ): Promise<FlowVersionResponseDto> {
    const version = await this.flowVersionRepository.findOne({where: {id}});

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ id }" not found`);
    }

    if (version.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be modified');
    }

    Object.assign(version, updateData);
    const savedVersion = await this.flowVersionRepository.save(version);
    return this.mapToResponseDto(savedVersion);
  }

  /**
   * Publish a flow version (makes it immutable)
   */
  async publishFlowVersion(id: string, publishedBy: string): Promise<FlowVersionResponseDto> {
    const version = await this.flowVersionRepository.findOne({
      where: {id},
      relations: [ 'steps', 'categories', 'terminationRules' ],
    });

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ id }" not found`);
    }

    if (version.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be published');
    }

    // TODO: Add validation logic for complete flow definition
    // - Ensure at least one step exists
    // - Validate step connections
    // - Validate field definitions
    // - Validate termination rules

    // Generate schema hash for integrity
    const schemaHash = this.generateSchemaHash(version);

    version.status = FlowVersionStatus.PUBLISHED;
    version.publishedAt = new Date();
    version.publishedBy = publishedBy;
    version.schemaHash = schemaHash;

    const savedVersion = await this.flowVersionRepository.save(version);
    return this.mapToResponseDto(savedVersion);
  }

  /**
   * Archive a flow version
   */
  async archiveFlowVersion(id: string): Promise<FlowVersionResponseDto> {
    const version = await this.flowVersionRepository.findOne({where: {id}});

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ id }" not found`);
    }

    if (version.status === FlowVersionStatus.DRAFT) {
      throw new BadRequestException('DRAFT versions cannot be archived, delete them instead');
    }

    version.status = FlowVersionStatus.ARCHIVED;
    const savedVersion = await this.flowVersionRepository.save(version);
    return this.mapToResponseDto(savedVersion);
  }

  /**
   * Delete a flow version (only if DRAFT)
   */
  async deleteFlowVersion(id: string): Promise<void> {
    const version = await this.flowVersionRepository.findOne({where: {id}});

    if (!version) {
      throw new NotFoundException(`Flow version with ID "${ id }" not found`);
    }

    if (version.status !== FlowVersionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT versions can be deleted');
    }

    await this.flowVersionRepository.remove(version);
  }

  /**
   * Generate schema hash for version integrity
   */
  private generateSchemaHash(version: FlowVersionEntity): string {
    // TODO: Implement proper schema hashing
    // This should create a hash of the complete version structure
    // including steps, fields, categories, and rules
    const timestamp = new Date().getTime();
    return `sha256:${ version.id }-${ timestamp }`;
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(version: FlowVersionEntity): FlowVersionResponseDto {
    const dto = new FlowVersionResponseDto();
    dto.id = version.id;
    dto.templateId = version.templateId;
    dto.version = version.version;
    dto.status = version.status;
    dto.publishedAt = version.publishedAt;
    dto.schemaHash = version.schemaHash;
    dto.notes = version.notes;
    dto.publishedBy = version.publishedBy;
    dto.createdAt = version.createdAt;
    dto.updatedAt = version.updatedAt;

    // Add computed fields if relations are loaded
    if (version.steps) {
      dto.stepsCount = version.steps.length;
    }

    if (version.categories) {
      dto.categoriesCount = version.categories.length;
    }

    if (version.terminationRules) {
      dto.terminationRulesCount = version.terminationRules.length;
    }

    dto.canEdit = version.status === FlowVersionStatus.DRAFT;

    return dto;
  }
}
