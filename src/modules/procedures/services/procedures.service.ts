import { ConflictException, Injectable, NotFoundException }                  from '@nestjs/common';
import { InjectRepository }                                                  from '@nestjs/typeorm';
import { Repository }                                                        from 'typeorm';
import { EventEmitter2 }                                                     from '@nestjs/event-emitter';
import { AuditEntity, ProcedureEntity, ProcedureVersionEntity }              from '../domain/entities';
import { AuditAction, ProcedureStatus }                                      from '../domain/enums';
import { CreateProcedureDto, CreateProcedureVersionDto, QueryProceduresDto } from '../dto/create-procedure.dto';
import { PaginationDto }                                                     from '@shared/utils/dto/pagination.dto';
import { FileEntity }                                                        from '@modules/files/domain/entities/file.entity';
import { FileMapper }                                                        from '@modules/files/domain/mappers/file.mapper';
import { FileType }                                                          from '@modules/files/domain/file';

/**
 * Interface for paginated results
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for procedure creation result
 */
export interface ProcedureCreationResult {
  procedure: ProcedureEntity;
  version: ProcedureVersionEntity;
}

/**
 * Service for managing procedures and their versions
 * Implements business logic with audit logging and event emission
 */
@Injectable()
export class ProceduresService {
  constructor(
    @InjectRepository(ProcedureEntity)
    private readonly procedureRepository: Repository<ProcedureEntity>,
    @InjectRepository(ProcedureVersionEntity)
    private readonly versionRepository: Repository<ProcedureVersionEntity>,
    @InjectRepository(AuditEntity)
    private readonly auditRepository: Repository<AuditEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new procedure with its first version
   */
  async createProcedure(
    createProcedureDto: CreateProcedureDto,
    tenantId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<ProcedureCreationResult> {
    // Check if code already exists for this tenant
    const existingProcedure = await this.procedureRepository.findOne({
      where: {code: createProcedureDto.code, tenantId}
    });

    if (existingProcedure) {
      throw new ConflictException(`Ya existe un procedimiento con el código '${ createProcedureDto.code }'`);
    }

    // Create procedure
    const procedure = this.procedureRepository.create({
      ...createProcedureDto,
      tenantId,
      status: ProcedureStatus.DRAFT,
      currentVersion: 1,
      legalCategories: createProcedureDto.legalCategories || [],
      tags: createProcedureDto.tags || [],
    });

    const savedProcedure = await this.procedureRepository.save(procedure);

    const content = new FileEntity();
    content.id = createProcedureDto.content.id;
    content.path = createProcedureDto.content.path;

    // Create first version with content reference structure
    const version = this.versionRepository.create({
      procedureId: savedProcedure.id,
      tenantId,
      versionNumber: 1,
      title: createProcedureDto.title,
      status: ProcedureStatus.DRAFT,
      authorId: createProcedureDto.authorId,
      isCurrent: true,
      content,
      annexes: [],
      legalReferences: [],
      quizQuestions: [],
    });

    const savedVersion = await this.versionRepository.save(version);

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.CREATE,
      entityType: 'Procedure',
      entityId: savedProcedure.id,
      userId: createProcedureDto.authorId,
      description: `Procedimiento creado: ${ savedProcedure.title }`,
      newState: {
        procedure: savedProcedure,
        version: savedVersion
      },
      context: userContext,
      tenantId,
    });

    // Emit event for async processing
    this.eventEmitter.emit('procedure.created', {
      procedure: savedProcedure,
      version: savedVersion,
      tenantId,
      userId: createProcedureDto.authorId,
    });

    return {
      procedure: savedProcedure,
      version: savedVersion,
    };
  }

  /**
   * Create a new version of an existing procedure
   */
  async createProcedureVersion(
    procedureId: string,
    createVersionDto: CreateProcedureVersionDto,
    tenantId: string,
    userContext?: { ip?: string; userAgent?: string }
  ): Promise<ProcedureVersionEntity> {
    // Get existing procedure
    const procedure = await this.findProcedureById(procedureId, tenantId);

    // Get current version to copy data
    const currentVersion = await this.versionRepository.findOne({
      where: {procedureId, isCurrent: true, tenantId}
    });

    if (!currentVersion) {
      throw new NotFoundException('No se encontró la versión actual del procedimiento');
    }

    const newVersionNumber = procedure.currentVersion + 1;

    // Mark current version as not current
    await this.versionRepository.update(
      {procedureId, isCurrent: true, tenantId},
      {isCurrent: false}
    );

    // Create new version with content reference structure
    const newVersion = this.versionRepository.create({
      procedureId,
      tenantId,
      versionNumber: newVersionNumber,
      title: createVersionDto.title,
      authorId: createVersionDto.authorId,
      effectiveDate: createVersionDto.effectiveDate,
      status: ProcedureStatus.DRAFT,
      isCurrent: true,
      // Copy content from current version
      content: currentVersion.content,
      // Keep metadata from current version
      annexes: currentVersion.annexes || [],
      legalReferences: currentVersion.legalReferences || [],
      quizQuestions: currentVersion.quizQuestions || [],
    });

    const savedVersion = await this.versionRepository.save(newVersion);

    // Update procedure's current version number and title
    await this.procedureRepository.update(procedureId, {
      currentVersion: newVersionNumber,
      title: createVersionDto.title,
      status: ProcedureStatus.DRAFT,
    });

    // Create changelog comparing versions
    const changelog = this.generateChangelog(currentVersion, savedVersion);
    await this.versionRepository.update(savedVersion.id, {changelog});

    // Create audit log
    await this.createAuditLog({
      action: AuditAction.UPDATE,
      entityType: 'ProcedureVersion',
      entityId: savedVersion.id,
      userId: createVersionDto.authorId,
      description: `Nueva versión ${ newVersionNumber } creada: ${ createVersionDto.title }`,
      previousState: currentVersion,
      newState: savedVersion,
      context: userContext,
      tenantId,
      relatedEntities: [ {entityType: 'Procedure', entityId: procedureId, relationshipType: 'parent'} ],
    });

    // Emit event
    this.eventEmitter.emit('procedure.version.created', {
      procedure,
      version: savedVersion,
      previousVersion: currentVersion,
      tenantId,
      userId: createVersionDto.authorId,
    });

    return savedVersion;
  }

  /**
   * Find a procedure by ID with tenant isolation
   */
  async findProcedureById(id: string, tenantId: string): Promise<ProcedureEntity> {
    const procedure = await this.procedureRepository.findOne({
      where: {id, tenantId}
    });

    if (!procedure) {
      throw new NotFoundException(`Procedimiento con ID ${ id } no encontrado`);
    }

    return procedure;
  }

  /**
   * Find a procedure with its current version
   */
  async findProcedureWithCurrentVersion(
    id: string,
    tenantId: string
  ): Promise<ProcedureEntity & { currentVersionDetails: ProcedureVersionEntity }> {
    const procedure = await this.findProcedureById(id, tenantId);

    const currentVersion = await this.versionRepository.findOne({
      where: {procedureId: id, isCurrent: true, tenantId}
    });

    if (!currentVersion) {
      throw new NotFoundException('No se encontró la versión actual del procedimiento');
    }

    return Object.assign(procedure, {currentVersionDetails: currentVersion});
  }


  /**
   * Query procedures with filtering and pagination
   */
  async queryProcedures(
    query: QueryProceduresDto,
    tenantId: string
  ): Promise<PaginationDto<ProcedureEntity & { latestVersionFile?: FileType }>> {
    const queryBuilder = this.procedureRepository
      .createQueryBuilder('procedure')
      .leftJoinAndSelect('procedure.versions', 'versions')
      .leftJoinAndSelect('versions.content', 'content')
      .where('procedure.tenantId = :tenantId', {tenantId});

    // Apply filters
    if (query.search) {
      queryBuilder.andWhere(
        '(procedure.title ILIKE :search OR procedure.description ILIKE :search OR :search = ANY(procedure.tags))',
        {search: `%${ query.search }%`}
      );
    }

    if (query.department) {
      queryBuilder.andWhere('procedure.department ILIKE :department', {
        department: `%${ query.department }%`
      });
    }

    if (query.priority) {
      queryBuilder.andWhere('procedure.priority = :priority', {priority: query.priority});
    }

    if (query.legalCategories && query.legalCategories.length > 0) {
      queryBuilder.andWhere('procedure.legalCategories && :legalCategories', {
        legalCategories: query.legalCategories
      });
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere('procedure.tags && :tags', {tags: query.tags});
    }

    // Apply sorting
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`procedure.${ sortField }`, sortOrder);

    // Apply pagination
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    // Execute queries
    const [ rawResults, total ] = await queryBuilder.getManyAndCount();

    // Process results to include file information from current version
    const items = await Promise.all(rawResults.map(async (result: ProcedureEntity) => {
      const procedure = result as ProcedureEntity;
      const extendedProcedure = procedure as ProcedureEntity & { latestVersionFile?: FileType };

      // Extract file information from current version content if available
      const latestVersion = await result.versions.then(versions => {
        return versions.find(version => version.isCurrent);
      });

      if (latestVersion && latestVersion.content) {
        extendedProcedure.latestVersionFile = FileMapper.toDomain(latestVersion.content);
      }

      return extendedProcedure;
    }));

    return new PaginationDto<ProcedureEntity & { latestVersionFile?: FileType }>({
      page,
      limit,
      total,
      items
    });
  }

  /**
   * Get all versions of a procedure
   */
  async getProcedureVersions(
    procedureId: string,
    tenantId: string
  ): Promise<ProcedureVersionEntity[]> {
    await this.findProcedureById(procedureId, tenantId); // Validate procedure exists

    return this.versionRepository.find({
      where: {procedureId, tenantId},
      order: {versionNumber: 'DESC'}
    });
  }

  /**
   * Get a specific version of a procedure
   */
  async getProcedureVersion(
    procedureId: string,
    versionNumber: number,
    tenantId: string
  ): Promise<ProcedureVersionEntity> {
    await this.findProcedureById(procedureId, tenantId); // Validate procedure exists

    const version = await this.versionRepository.findOne({
      where: {procedureId, versionNumber, tenantId}
    });

    if (!version) {
      throw new NotFoundException(
        `Versión ${ versionNumber } del procedimiento no encontrada`
      );
    }

    return version;
  }

  /**
   * Generate changelog between two versions
   */
  private generateChangelog(
    oldVersion: ProcedureVersionEntity,
    newVersion: ProcedureVersionEntity
  ): Record<string, { oldValue?: any; newValue?: any; action: 'added' | 'modified' | 'removed' }> {
    const changelog: Record<string, any> = {};

    const fieldsToCompare = [ 'title', 'purpose', 'scope', 'responsibilities' ];

    for (const field of fieldsToCompare) {
      const oldValue = oldVersion[field as keyof ProcedureVersionEntity];
      const newValue = newVersion[field as keyof ProcedureVersionEntity];

      if (oldValue !== newValue) {
        changelog[field] = {
          oldValue,
          newValue,
          action: !oldValue ? 'added' : !newValue ? 'removed' : 'modified'
        };
      }
    }

    return changelog;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    userId: string;
    description: string;
    previousState?: any;
    newState?: any;
    context?: { ip?: string; userAgent?: string };
    tenantId: string;
    relatedEntities?: Array<{ entityType: string; entityId: string; relationshipType: string }>;
  }): Promise<void> {
    try {
      const auditEntry = this.auditRepository.create({
        ...data,
        timestamp: new Date(),
        userFullName: 'Sistema', // TODO: Get from user service
        userEmail: 'system@example.com', // TODO: Get from user service
        success: true,
        sourceSystem: 'procedures-module',
        relatedEntities: data.relatedEntities || [],
      });

      await this.auditRepository.save(auditEntry);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Error creating audit log:', error);
    }
  }
}
