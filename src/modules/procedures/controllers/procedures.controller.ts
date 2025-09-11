import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards
}                                                                            from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
}                                                                            from '@nestjs/swagger';
import { Request }                                                           from 'express';
import { ProceduresService }                                                 from '../services/procedures.service';
import { ReviewService, SubmitReviewDto }                                    from '../services/review.service';
import {
  PublicationSchedulerService,
  SchedulePublicationParams
}                                                                            from '../services/publication-scheduler.service';
import {
  DistributionTargetConfig,
  ExecutePublicationParams,
  LegalEvidenceUpload,
  PublicationService
}                                                                            from '../services/publication.service';
import {
  AcknowledgementService,
  CreateAcknowledgmentDto,
  CreateEConsentDto,
  SubmitQuizDto
}                                                                            from '../services/acknowledgement.service';
import { HealthCheckResult, HealthService }                                  from '../services/health.service';
import { CreateProcedureDto, CreateProcedureVersionDto, QueryProceduresDto } from '../dto/create-procedure.dto';
import { CurrentUser }                                                       from '@shared/decorators/current-user.decorator';
import { UserRequest }                                                       from '@modules/users/domain/models/user-request';
import { TenantService }                                                     from '@modules/tenant/services/tenant.service';
import { AuthGuard }                                                         from '@nestjs/passport';

/**
 * Controller for managing procedures and their versions
 * Implements minimal endpoints as specified in the plan
 */
@ApiTags('Procedures')
@Controller('procedures')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class ProceduresController {
  constructor(
    private readonly proceduresService: ProceduresService,
    private readonly reviewService: ReviewService,
    private readonly publicationSchedulerService: PublicationSchedulerService,
    private readonly publicationService: PublicationService,
    private readonly acknowledgementService: AcknowledgementService,
    private readonly healthService: HealthService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Create a new procedure
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo procedimiento',
    description: 'Crea un nuevo procedimiento con su primera versión en estado borrador'
  })
  @ApiCreatedResponse({
    description: 'Procedimiento creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        procedure: {
          type: 'object',
          description: 'Datos del procedimiento creado'
        },
        version: {
          type: 'object',
          description: 'Primera versión del procedimiento'
        }
      }
    }
  })
  @ApiConflictResponse({
    description: 'Ya existe un procedimiento con el mismo código',
    schema: {
      type: 'object',
      properties: {
        statusCode: {type: 'number', example: 409},
        message: {type: 'string', example: 'Ya existe un procedimiento con el código PROC-001'}
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: {type: 'number', example: 400},
        message: {type: 'array', items: {type: 'string'}},
        error: {type: 'string', example: 'Bad Request'}
      }
    }
  })
  async createProcedure(
    @Body() createProcedureDto: CreateProcedureDto,
    @CurrentUser() currentUser: UserRequest,
    @Req() req: Request
  ) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const userContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    createProcedureDto.authorId = currentUser?.id;

    return await this.proceduresService.createProcedure(
      createProcedureDto,
      tenantId,
      userContext
    );
  }

  /**
   * Create a new version of an existing procedure
   */
  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nueva versión de un procedimiento',
    description: 'Crea una nueva versión de un procedimiento existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiCreatedResponse({
    description: 'Nueva versión creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'object',
          description: 'Nueva versión del procedimiento'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Procedimiento no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: {type: 'number', example: 404},
        message: {type: 'string', example: 'Procedimiento con ID xxx no encontrado'}
      }
    }
  })
  async createProcedureVersion(
    @Param('id', ParseUUIDPipe) procedureId: string,
    @Body() createVersionDto: CreateProcedureVersionDto,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId;
    const userContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    return await this.proceduresService.createProcedureVersion(
      procedureId,
      createVersionDto,
      tenantId,
      userContext
    );
  }


  /**
   * Get a procedure by ID with its current version
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener procedimiento por ID',
    description: 'Obtiene un procedimiento específico con su versión actual'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Procedimiento encontrado',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'object',
          description: 'Procedimiento con su versión actual'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Procedimiento no encontrado'
  })
  async getProcedure(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    const procedure = await this.proceduresService.findProcedureWithCurrentVersion(id, tenantId);

    return {
      message: 'Procedimiento encontrado',
      data: procedure
    };
  }

  /**
   * Query procedures with filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Buscar procedimientos',
    description: 'Busca procedimientos con filtros y paginación'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Término de búsqueda para título, descripción o etiquetas',
    example: 'seguridad'
  })
  @ApiQuery({
    name: 'department',
    required: false,
    description: 'Filtrar por departamento',
    example: 'Seguridad y Prevención de Riesgos'
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filtrar por nivel de prioridad',
    enum: [ 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL' ]
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filtrar por etiquetas (separadas por coma)',
    example: 'seguridad,prevencion'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
    type: 'number'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de elementos por página',
    example: 20,
    type: 'number'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Campo para ordenar',
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Orden de clasificación',
    enum: [ 'ASC', 'DESC' ],
    example: 'DESC'
  })
  @ApiOkResponse({
    description: 'Lista de procedimientos',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {type: 'object'}
            },
            total: {type: 'number'},
            page: {type: 'number'},
            limit: {type: 'number'},
            totalPages: {type: 'number'}
          }
        }
      }
    }
  })
  queryProcedures(
    @Query() query: QueryProceduresDto,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    return this.proceduresService.queryProcedures(query, tenantId);
  }

  /**
   * Get all versions of a procedure
   */
  @Get(':id/versions')
  @ApiOperation({
    summary: 'Obtener versiones de un procedimiento',
    description: 'Obtiene todas las versiones de un procedimiento específico'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Lista de versiones del procedimiento',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {type: 'object'}
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Procedimiento no encontrado'
  })
  async getProcedureVersions(
    @Param('id', ParseUUIDPipe) procedureId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    return await this.proceduresService.getProcedureVersions(procedureId, tenantId);
  }

  /**
   * Get a specific version of a procedure
   */
  @Get(':id/versions/:versionNumber')
  @ApiOperation({
    summary: 'Obtener versión específica de un procedimiento',
    description: 'Obtiene una versión específica de un procedimiento'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiParam({
    name: 'versionNumber',
    description: 'Número de versión',
    example: 2,
    type: 'number'
  })
  @ApiOkResponse({
    description: 'Versión específica del procedimiento',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'object',
          description: 'Versión específica del procedimiento'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Procedimiento o versión no encontrada'
  })
  async getProcedureVersion(
    @Param('id', ParseUUIDPipe) procedureId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    return await this.proceduresService.getProcedureVersion(
      procedureId,
      versionNumber,
      tenantId
    );
  }

  /**
   * Submit a procedure version for review
   */
  @Post('versions/:versionId/submit-review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar versión para revisión',
    description: 'Inicia el proceso de revisión para una versión de procedimiento'
  })
  @ApiParam({
    name: 'versionId',
    description: 'ID único de la versión del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiCreatedResponse({
    description: 'Proceso de revisión iniciado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {type: 'object'}
        }
      }
    }
  })
  async submitForReview(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';
    const userContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    return await this.reviewService.startApprovalWorkflow(
      versionId,
      userId,
      tenantId,
      userContext
    );
  }

  /**
   * Submit a review (approve, request changes, or reject)
   */
  @Post('reviews/:reviewId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar revisión',
    description: 'Aprobar, solicitar cambios o rechazar una revisión'
  })
  @ApiParam({
    name: 'reviewId',
    description: 'ID único de la solicitud de revisión',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Revisión completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {type: 'object'}
      }
    }
  })
  async submitReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() submitReviewDto: SubmitReviewDto,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';
    const userContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const review = await this.reviewService.submitReview(
      reviewId,
      submitReviewDto,
      userId,
      tenantId,
      userContext
    );

    return {
      message: `Revisión ${ submitReviewDto.status.toLowerCase() } exitosamente`,
      data: review
    };
  }

  /**
   * Get all reviews for a procedure version
   */
  @Get('versions/:versionId/reviews')
  @ApiOperation({
    summary: 'Obtener revisiones de una versión',
    description: 'Obtiene todas las revisiones de una versión específica'
  })
  @ApiParam({
    name: 'versionId',
    description: 'ID único de la versión del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Lista de revisiones',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {type: 'object'}
        }
      }
    }
  })
  async getVersionReviews(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    const reviews = await this.reviewService.getReviewsForVersion(versionId, tenantId);

    return {
      message: `Se encontraron ${ reviews.length } revisión(es)`,
      data: reviews
    };
  }

  /**
   * Get pending reviews for current user
   */
  @Get('reviews/pending')
  @ApiOperation({
    summary: 'Obtener revisiones pendientes',
    description: 'Obtiene las revisiones pendientes para el usuario actual'
  })
  @ApiOkResponse({
    description: 'Lista de revisiones pendientes',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {type: 'object'}
        }
      }
    }
  })
  async getPendingReviews(
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const reviews = await this.reviewService.getPendingReviewsForUser(userId, tenantId);

    return {
      message: `Tienes ${ reviews.length } revisión(es) pendiente(s)`,
      data: reviews
    };
  }

  /**
   * Schedule a procedure version for publication
   */
  @Post('versions/:versionId/schedule-publish')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Programar publicación de procedimiento',
    description: 'Programa la publicación de un procedimiento con cumplimiento legal chileno'
  })
  @ApiParam({
    name: 'versionId',
    description: 'ID único de la versión del procedimiento',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiCreatedResponse({
    description: 'Publicación programada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {type: 'object'}
      }
    }
  })
  async schedulePublication(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() scheduleParams: Omit<SchedulePublicationParams, 'versionId' | 'scheduledBy' | 'tenantId'>,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const fullParams: SchedulePublicationParams = {
      ...scheduleParams,
      versionId,
      scheduledBy: userId,
      tenantId
    };

    const publication = await this.publicationSchedulerService.schedulePublication(fullParams);

    return {
      message: 'Publicación programada exitosamente',
      data: publication
    };
  }

  /**
   * Get all scheduled publications
   */
  @Get('admin/scheduled-publications')
  @ApiOperation({
    summary: 'Obtener publicaciones programadas',
    description: 'Lista todas las publicaciones programadas para el tenant'
  })
  @ApiOkResponse({
    description: 'Lista de publicaciones programadas',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {type: 'object'}
        }
      }
    }
  })
  async getScheduledPublications(
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    const publications = await this.publicationSchedulerService.getScheduledPublications(tenantId);

    return {
      message: `Se encontraron ${ publications.length } publicación(es) programada(s)`,
      data: publications
    };
  }

  /**
   * Get queue health status
   */
  @Get('admin/queue-health')
  @ApiOperation({
    summary: 'Estado de salud de las colas',
    description: 'Obtiene el estado de salud de las colas BullMQ'
  })
  @ApiOkResponse({
    description: 'Estado de salud de las colas',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'object',
          properties: {
            isHealthy: {type: 'boolean'},
            activeJobs: {type: 'number'},
            waitingJobs: {type: 'number'},
            completedJobs: {type: 'number'},
            failedJobs: {type: 'number'},
            schedulers: {type: 'array'}
          }
        }
      }
    }
  })
  async getQueueHealth() {
    const health = await this.publicationSchedulerService.getQueueHealth();

    return {
      message: health.isHealthy ? 'Colas saludables' : 'Problemas en las colas',
      data: health
    };
  }

  /**
   * Get all job schedulers
   */
  @Get('admin/schedulers')
  @ApiOperation({
    summary: 'Listar schedulers activos',
    description: 'Obtiene la lista de todos los job schedulers activos'
  })
  @ApiOkResponse({
    description: 'Lista de schedulers activos',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              name: {type: 'string'},
              nextRunTime: {type: 'string', format: 'date-time', nullable: true},
              pattern: {type: 'string', nullable: true},
              isActive: {type: 'boolean'},
              jobsCount: {type: 'number'}
            }
          }
        }
      }
    }
  })
  async getJobSchedulers() {
    const schedulers = await this.publicationSchedulerService.getJobSchedulers();

    return {
      message: `Se encontraron ${ schedulers.length } scheduler(s) activo(s)`,
      data: schedulers
    };
  }

  /**
   * Remove a specific job scheduler
   */
  @Delete('admin/schedulers/:schedulerId')
  @ApiOperation({
    summary: 'Eliminar scheduler',
    description: 'Elimina un job scheduler específico'
  })
  @ApiParam({
    name: 'schedulerId',
    description: 'ID único del scheduler a eliminar',
    example: 'sched:prenotice:550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiOkResponse({
    description: 'Scheduler eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {type: 'string'},
        success: {type: 'boolean'}
      }
    }
  })
  async removeJobScheduler(
    @Param('schedulerId') schedulerId: string
  ) {
    const success = await this.publicationSchedulerService.removeJobScheduler(schedulerId);

    return {
      message: success
        ? `Scheduler ${ schedulerId } eliminado exitosamente`
        : `Error al eliminar scheduler ${ schedulerId }`,
      success
    };
  }

  /**
   * Execute a publication
   */
  @Post('publications/:publicationId/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar publicación',
    description: 'Ejecuta una publicación programada generando PDF y distribuyendo'
  })
  @ApiParam({
    name: 'publicationId',
    description: 'ID único de la publicación',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  async executePublication(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const params: ExecutePublicationParams = {
      publicationId,
      tenantId,
      executedBy: userId
    };

    const publication = await this.publicationService.executePublication(params);

    return {
      message: 'Publicación ejecutada exitosamente',
      data: publication
    };
  }

  /**
   * Add distribution targets to a publication
   */
  @Post('publications/:publicationId/distribution-targets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar objetivos de distribución',
    description: 'Agrega objetivos de distribución a una publicación'
  })
  async addDistributionTargets(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Body() targets: DistributionTargetConfig[],
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const publication = await this.publicationService.addDistributionTargets(
      publicationId,
      targets,
      tenantId,
      userId
    );

    return {
      message: 'Objetivos de distribución agregados exitosamente',
      data: publication
    };
  }

  /**
   * Add legal evidence to a publication
   */
  @Post('publications/:publicationId/legal-evidence')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar evidencia legal',
    description: 'Agrega evidencia legal de cumplimiento a una publicación'
  })
  async addLegalEvidence(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Body() evidence: LegalEvidenceUpload,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const publication = await this.publicationService.addLegalEvidence(
      publicationId,
      evidence,
      tenantId,
      userId
    );

    return {
      message: 'Evidencia legal agregada exitosamente',
      data: publication
    };
  }

  /**
   * Create an acknowledgment
   */
  @Post('publications/:publicationId/acknowledge')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear acuse de recibo',
    description: 'Crea un acuse de recibo para una publicación'
  })
  async createAcknowledgment(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Body() createDto: Omit<CreateAcknowledgmentDto, 'publicationId'>,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userContext = {
      geoLocation: req.body.geoLocation
    };

    const fullDto: CreateAcknowledgmentDto = {
      ...createDto,
      publicationId
    };

    const acknowledgment = await this.acknowledgementService.createAcknowledgment(
      fullDto,
      tenantId,
      userContext
    );

    return {
      message: 'Acuse de recibo creado exitosamente',
      data: acknowledgment
    };
  }

  /**
   * Submit quiz for an acknowledgment
   */
  @Post('acknowledgments/:acknowledgmentId/quiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar quiz',
    description: 'Envía respuestas del quiz para un acuse de recibo'
  })
  async submitQuiz(
    @Param('acknowledgmentId', ParseUUIDPipe) acknowledgmentId: string,
    @Body() submitQuizDto: Omit<SubmitQuizDto, 'acknowledgmentId'>,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const fullDto: SubmitQuizDto = {
      ...submitQuizDto,
      acknowledgmentId
    };

    const acknowledgment = await this.acknowledgementService.submitQuiz(
      fullDto,
      tenantId,
      userId
    );

    return {
      message: 'Quiz enviado exitosamente',
      data: acknowledgment
    };
  }

  /**
   * Create electronic consent for an acknowledgment
   */
  @Post('acknowledgments/:acknowledgmentId/econsent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear consentimiento electrónico',
    description: 'Crea consentimiento electrónico para un acuse de recibo'
  })
  async createElectronicConsent(
    @Param('acknowledgmentId', ParseUUIDPipe) acknowledgmentId: string,
    @Body() econsentDto: CreateEConsentDto,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';
    const userId = req.user?.id || 'system';

    const econsent = await this.acknowledgementService.createElectronicConsent(
      acknowledgmentId,
      econsentDto,
      tenantId,
      userId
    );

    return {
      message: 'Consentimiento electrónico creado exitosamente',
      data: econsent
    };
  }

  /**
   * Get acknowledgments for a publication
   */
  @Get('publications/:publicationId/acknowledgments')
  @ApiOperation({
    summary: 'Obtener acuses de una publicación',
    description: 'Obtiene todos los acuses de recibo de una publicación'
  })
  async getPublicationAcknowledgments(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    const acknowledgments = await this.acknowledgementService.getAcknowledgmentsForPublication(
      publicationId,
      tenantId
    );

    return {
      message: `Se encontraron ${ acknowledgments.length } acuse(s) de recibo`,
      data: acknowledgments
    };
  }

  /**
   * Get acknowledgment statistics for a publication
   */
  @Get('publications/:publicationId/acknowledgments/statistics')
  @ApiOperation({
    summary: 'Estadísticas de acuses',
    description: 'Obtiene estadísticas de acuses de recibo para una publicación'
  })
  async getAcknowledgmentStatistics(
    @Param('publicationId', ParseUUIDPipe) publicationId: string,
    @Req() req: Request
  ) {
    const tenantId = req.user.tenantId || 'default-tenant';

    const statistics = await this.acknowledgementService.getAcknowledgmentStatistics(
      publicationId,
      tenantId
    );

    return {
      message: 'Estadísticas de acuses obtenidas',
      data: statistics
    };
  }

  /**
   * Health check endpoint for the procedures module
   */
  @Get('admin/health')
  @ApiOperation({
    summary: 'Health check del módulo de procedimientos',
    description: 'Verificación completa de salud incluyendo BD, colas, servicios y métricas'
  })
  @ApiOkResponse({
    description: 'Estado de salud detallado del módulo',
    schema: {
      type: 'object',
      properties: {
        status: {type: 'string', enum: [ 'healthy', 'degraded', 'unhealthy' ]},
        timestamp: {type: 'string', format: 'date-time'},
        checks: {
          type: 'object',
          properties: {
            database: {type: 'object'},
            queues: {type: 'object'},
            services: {type: 'object'},
            storage: {type: 'object'}
          }
        },
        metrics: {type: 'object'},
        version: {type: 'string'},
        environment: {type: 'string'}
      }
    }
  })
  async healthCheck(@Req() req: Request): Promise<HealthCheckResult> {
    const tenantId = req.user.tenantId;
    return this.healthService.performHealthCheck(tenantId);
  }

  /**
   * Simple health check endpoint for quick status
   */
  @Get('admin/health/simple')
  @ApiOperation({
    summary: 'Health check simple',
    description: 'Verificación rápida de salud para monitoreo básico'
  })
  @ApiOkResponse({
    description: 'Estado de salud básico',
    schema: {
      type: 'object',
      properties: {
        status: {type: 'string'},
        timestamp: {type: 'string', format: 'date-time'},
        uptime: {type: 'number'}
      }
    }
  })
  async simpleHealthCheck() {
    return this.healthService.getSimpleHealth();
  }
}
