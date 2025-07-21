import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { ChecklistExecutionEntity }                           from '../domain/entities/checklist-execution.entity';
import { ChecklistAnswerEntity }                              from '../domain/entities/checklist-answer.entity';
import { ChecklistTemplateEntity }                            from '../domain/entities/checklist-template.entity';
import { ChecklistGroupEntity }                               from '../domain/entities/checklist-group.entity';
import { QuestionEntity }                                     from '../domain/entities/question.entity';
import { IncidentEntity }                                     from '../domain/entities/incident.entity';
import { CreateChecklistExecutionDto, ChecklistAnswerDto }    from '../domain/dto/create-checklist-execution.dto';
import { QueryChecklistExecutionDto }                         from '../domain/dto/query-checklist-execution.dto';
import { ExecutionStatus }                                    from '../domain/enums/execution-status.enum';
import { ChecklistType }                                      from '../domain/enums/checklist-type.enum';
import { ApprovalStatus }                                     from '../domain/enums/approval-status.enum';
import { IncidentSeverity, IncidentStatus }                   from '../domain/entities/incident.entity';

interface ScoreCalculationResult {
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  categoryScores: Record<string, number>;
  groupScore?: number;
  templateScores?: Record<string, number>;
}

@Injectable()
export class ChecklistExecutionService {
  constructor(
    @InjectRepository(ChecklistExecutionEntity)
    private readonly executionRepository: Repository<ChecklistExecutionEntity>,
    @InjectRepository(ChecklistAnswerEntity)
    private readonly answerRepository: Repository<ChecklistAnswerEntity>,
    @InjectRepository(ChecklistTemplateEntity)
    private readonly templateRepository: Repository<ChecklistTemplateEntity>,
    @InjectRepository(ChecklistGroupEntity)
    private readonly groupRepository: Repository<ChecklistGroupEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
  ) {}

  /**
   * Execute a checklist (template or group) with answers
   */
  async executeChecklist(dto: CreateChecklistExecutionDto): Promise<ChecklistExecutionEntity> {
    this.validateExecutionDto(dto);

    const execution = await this.createExecution(dto);
    const questions = await this.getQuestionsForExecution(dto);

    this.validateRequiredQuestions(questions, dto.answers);
    this.validateAnswerTypes(questions, dto.answers);

    const answers = await this.saveAnswers(execution, dto.answers);
    const scoreResult = await this.calculateScore(execution, questions, answers);

    execution.totalScore = scoreResult.totalScore;
    execution.maxPossibleScore = scoreResult.maxPossibleScore;
    execution.percentageScore = scoreResult.percentageScore;
    execution.categoryScores = scoreResult.categoryScores;
    execution.groupScore = scoreResult.groupScore;
    execution.templateScores = scoreResult.templateScores;
    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();

    await this.executionRepository.save(execution);

    await this.checkForIncidentCreation(execution);

    return this.findById(execution.id);
  }

  /**
   * Find execution by ID with relations
   */
  async findById(id: string): Promise<ChecklistExecutionEntity> {
    const execution = await this.executionRepository.findOne({
      where: {id},
      relations: [
        'template',
        'group',
        'executorUser',
        'targetVehicle',
        'answers',
        'answers.question',
        'incident'
      ]
    });

    if (!execution) {
      throw new NotFoundException(`Checklist execution with ID ${ id } not found`);
    }

    return execution;
  }

  /**
   * Find executions with filtering and pagination
   */
  async findAll(query: QueryChecklistExecutionDto): Promise<[ ChecklistExecutionEntity[], number ]> {
    const queryBuilder = this.executionRepository.createQueryBuilder('execution')
      .leftJoinAndSelect('execution.template', 'template')
      .leftJoinAndSelect('execution.group', 'group')
      .leftJoinAndSelect('execution.executorUser', 'executorUser')
      .leftJoinAndSelect('execution.targetVehicle', 'targetVehicle')
      .leftJoinAndSelect('execution.incident', 'incident');

    if (query.templateId) {
      queryBuilder.andWhere('execution.templateId = :templateId', {templateId: query.templateId});
    }

    if (query.groupId) {
      queryBuilder.andWhere('execution.groupId = :groupId', {groupId: query.groupId});
    }

    if (query.executorUserId) {
      queryBuilder.andWhere('execution.executorUserId = :executorUserId', {executorUserId: query.executorUserId});
    }

    if (query.targetVehicleId) {
      queryBuilder.andWhere('execution.targetVehicleId = :targetVehicleId', {targetVehicleId: query.targetVehicleId});
    }

    if (query.status) {
      queryBuilder.andWhere('execution.status = :status', {status: query.status});
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('execution.executionTimestamp BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy('execution.executionTimestamp', 'DESC')
      .skip(skip)
      .take(limit);

    return queryBuilder.getManyAndCount();
  }

  private validateExecutionDto(dto: CreateChecklistExecutionDto): void {
    if (!dto.templateId && !dto.groupId) {
      throw new BadRequestException('Either templateId or groupId must be provided');
    }

    if (dto.templateId && dto.groupId) {
      throw new BadRequestException('Cannot provide both templateId and groupId');
    }

    if (!dto.answers || dto.answers.length === 0) {
      throw new BadRequestException('At least one answer must be provided');
    }
  }

  private async createExecution(dto: CreateChecklistExecutionDto): Promise<ChecklistExecutionEntity> {
    const execution = new ChecklistExecutionEntity();
    execution.templateId = dto.templateId;
    execution.groupId = dto.groupId;
    execution.executorUserId = dto.executorUserId;
    execution.targetVehicleId = dto.targetVehicleId;
    execution.executionTimestamp = new Date(dto.executionTimestamp);
    execution.status = ExecutionStatus.IN_PROGRESS;
    execution.notes = dto.notes;

    return this.executionRepository.save(execution);
  }

  private async getQuestionsForExecution(dto: CreateChecklistExecutionDto): Promise<QuestionEntity[]> {
    if (dto.templateId) {
      return this.questionRepository.find({
        where: {category: {templateId: dto.templateId}, isActive: true},
        relations: [ 'category' ]
      });
    } else {
      return this.questionRepository.find({
        where: {category: {groupId: dto.groupId}, isActive: true},
        relations: [ 'category' ]
      });
    }
  }

  private validateRequiredQuestions(questions: QuestionEntity[], answers: ChecklistAnswerDto[]): void {
    const requiredQuestions = questions.filter(q => q.required);
    const answeredQuestionIds = new Set(answers.map(a => a.questionId));

    const missingRequired = requiredQuestions.filter(q => !answeredQuestionIds.has(q.id));

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing answers for required questions: ${ missingRequired.map(q => q.title).join(', ') }`
      );
    }
  }

  private validateAnswerTypes(questions: QuestionEntity[], answers: ChecklistAnswerDto[]): void {
    const questionMap = new Map(questions.map(q => [ q.id, q ]));

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(`Question with ID ${ answer.questionId } not found`);
      }

      this.validateAnswerType(question, answer);
    }
  }

  private validateAnswerType(question: QuestionEntity, answer: ChecklistAnswerDto): void {
    // Validate approval status is provided
    if (!answer.approvalStatus) {
      throw new BadRequestException(`Approval status required for question: ${ question.title }`);
    }

    // Validate approval value is provided and within valid range
    if (answer.approvalValue === undefined || answer.approvalValue === null) {
      throw new BadRequestException(`Approval value required for question: ${ question.title }`);
    }

    if (answer.approvalValue < 0 || answer.approvalValue > 1) {
      throw new BadRequestException(`Approval value must be between 0 and 1 for question: ${ question.title }`);
    }

    // Validate intermediate approval is only used when question supports it
    if (answer.approvalStatus === ApprovalStatus.INTERMEDIATE) {
      if (!question.hasIntermediateApproval) {
        throw new BadRequestException(`Intermediate approval not allowed for question: ${ question.title }`);
      }
      // Validate the approval value matches the question's intermediate value
      if (Math.abs(answer.approvalValue - question.intermediateValue) > 0.01) {
        throw new BadRequestException(`Intermediate approval value must be ${ question.intermediateValue } for question: ${ question.title }`);
      }
    }

    // Validate standard approval values
    if (answer.approvalStatus === ApprovalStatus.APPROVED && answer.approvalValue !== 1) {
      throw new BadRequestException(`Approved status must have value 1.0 for question: ${ question.title }`);
    }

    if (answer.approvalStatus === ApprovalStatus.NOT_APPROVED && answer.approvalValue !== 0) {
      throw new BadRequestException(`Not approved status must have value 0.0 for question: ${ question.title }`);
    }
  }

  private async saveAnswers(execution: ChecklistExecutionEntity, answerDtos: ChecklistAnswerDto[]): Promise<ChecklistAnswerEntity[]> {
    const answers: ChecklistAnswerEntity[] = [];

    for (const answerDto of answerDtos) {
      const answer = new ChecklistAnswerEntity();
      answer.executionId = execution.id;
      answer.questionId = answerDto.questionId;
      answer.approvalStatus = answerDto.approvalStatus;
      answer.approvalValue = answerDto.approvalValue;
      answer.evidenceFile = answerDto.evidenceFile;
      answer.comment = answerDto.comment;
      answer.answeredAt = new Date();

      answers.push(answer);
    }

    return this.answerRepository.save(answers);
  }

  private async calculateScore(
    execution: ChecklistExecutionEntity,
    questions: QuestionEntity[],
    answers: ChecklistAnswerEntity[]
  ): Promise<ScoreCalculationResult> {
    if (execution.groupId) {
      return this.calculateGroupScore(execution, questions, answers);
    } else {
      return this.calculateTemplateScore(execution, questions, answers);
    }
  }

  private async calculateTemplateScore(
    execution: ChecklistExecutionEntity,
    questions: QuestionEntity[],
    answers: ChecklistAnswerEntity[]
  ): Promise<ScoreCalculationResult> {
    const answerMap = new Map(answers.map(a => [ a.questionId, a ]));
    const categoryScores: Record<string, number> = {};

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Group questions by category
    const questionsByCategory = new Map<string, QuestionEntity[]>();
    for (const question of questions) {
      const categoryId = question.category.id;
      if (!questionsByCategory.has(categoryId)) {
        questionsByCategory.set(categoryId, []);
      }
      questionsByCategory.get(categoryId)!.push(question);
    }

    // Calculate score for each category
    for (const [ categoryId, categoryQuestions ] of questionsByCategory) {
      let categoryScore = 0;
      let categoryMaxScore = 0;

      for (const question of categoryQuestions) {
        const answer = answerMap.get(question.id);
        const questionScore = this.calculateQuestionScore(question, answer);

        categoryScore += questionScore * question.weight;
        categoryMaxScore += question.weight;

        // Update answer with calculated score
        if (answer) {
          answer.answerScore = questionScore;
          answer.maxScore = question.weight;
          await this.answerRepository.save(answer);
        }
      }

      const categoryPercentage = categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0;
      categoryScores[categoryId] = categoryPercentage;

      totalScore += categoryScore;
      maxPossibleScore += categoryMaxScore;
    }

    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      totalScore,
      maxPossibleScore,
      percentageScore,
      categoryScores
    };
  }

  private async calculateGroupScore(
    execution: ChecklistExecutionEntity,
    questions: QuestionEntity[],
    answers: ChecklistAnswerEntity[]
  ): Promise<ScoreCalculationResult> {
    // Get group with templates and weights
    const group = await this.groupRepository.findOne({
      where: {id: execution.groupId},
      relations: [ 'templates' ]
    });

    if (!group || !group.templates || group.templates.length === 0) {
      throw new BadRequestException('Group not found or has no templates');
    }

    if (!group.templateWeights) {
      throw new BadRequestException('Group template weights not configured');
    }

    const answerMap = new Map(answers.map(a => [ a.questionId, a ]));
    const templateScores: Record<string, number> = {};
    const categoryScores: Record<string, number> = {};

    let groupScore = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Calculate score for each template in the group
    for (const template of group.templates) {
      const templateQuestions = questions.filter(q =>
        q.category.templateId === template.id
      );

      if (templateQuestions.length === 0) continue;

      // Calculate template score using same logic as individual template
      const templateResult = await this.calculateTemplateScoreForQuestions(
        templateQuestions, answerMap
      );

      templateScores[template.id] = templateResult.percentageScore;

      // Apply template weight to group score calculation
      const templateWeight = group.templateWeights[template.id] || 0;
      groupScore += templateResult.percentageScore * templateWeight;

      // Merge category scores (prefixed with template ID to avoid conflicts)
      for (const [ categoryId, score ] of Object.entries(templateResult.categoryScores)) {
        categoryScores[`${ template.id }_${ categoryId }`] = score;
      }

      totalScore += templateResult.totalScore;
      maxPossibleScore += templateResult.maxPossibleScore;
    }

    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      totalScore,
      maxPossibleScore,
      percentageScore,
      categoryScores,
      groupScore,
      templateScores
    };
  }

  private async calculateTemplateScoreForQuestions(
    questions: QuestionEntity[],
    answerMap: Map<string, ChecklistAnswerEntity>
  ): Promise<{ totalScore: number; maxPossibleScore: number; percentageScore: number; categoryScores: Record<string, number> }> {
    const categoryScores: Record<string, number> = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Group questions by category
    const questionsByCategory = new Map<string, QuestionEntity[]>();
    for (const question of questions) {
      const categoryId = question.category.id;
      if (!questionsByCategory.has(categoryId)) {
        questionsByCategory.set(categoryId, []);
      }
      questionsByCategory.get(categoryId)!.push(question);
    }

    // Calculate score for each category
    for (const [ categoryId, categoryQuestions ] of questionsByCategory) {
      let categoryScore = 0;
      let categoryMaxScore = 0;

      for (const question of categoryQuestions) {
        const answer = answerMap.get(question.id);
        const questionScore = this.calculateQuestionScore(question, answer);

        categoryScore += questionScore * question.weight;
        categoryMaxScore += question.weight;

        // Update answer with calculated score
        if (answer) {
          answer.answerScore = questionScore;
          answer.maxScore = question.weight;
          await this.answerRepository.save(answer);
        }
      }

      const categoryPercentage = categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 0;
      categoryScores[categoryId] = categoryPercentage;

      totalScore += categoryScore;
      maxPossibleScore += categoryMaxScore;
    }

    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      totalScore,
      maxPossibleScore,
      percentageScore,
      categoryScores
    };
  }

  private calculateQuestionScore(question: QuestionEntity, answer?: ChecklistAnswerEntity): number {
    if (!answer || answer.isSkipped) {
      return 0;
    }

    // Use the approval value directly as the score
    // This represents the percentage of compliance for this question
    return answer.approvalValue;
  }

  private async checkForIncidentCreation(execution: ChecklistExecutionEntity): Promise<void> {
    let threshold: number;
    let checklistType: ChecklistType;
    let scoreToCheck: number;
    let isGroupExecution = false;

    if (execution.templateId) {
      const template = await this.templateRepository.findOne({
        where: {id: execution.templateId}
      });
      threshold = template?.performanceThreshold || 70;
      checklistType = template?.type || ChecklistType.INSPECTION;
      scoreToCheck = execution.percentageScore;
    } else {
      const group = await this.groupRepository.findOne({
        where: {id: execution.groupId}
      });
      threshold = group?.performanceThreshold || 70;
      checklistType = ChecklistType.COMPLIANCE; // Groups are typically for compliance evaluations
      scoreToCheck = execution.groupScore || execution.percentageScore;
      isGroupExecution = true;
    }

    // Create incident if:
    // 1. Template type is "compliance" and templateScore < threshold, OR
    // 2. Group execution and groupScore < threshold
    const shouldCreateIncident = (
      (checklistType === ChecklistType.COMPLIANCE && scoreToCheck < threshold) ||
      (isGroupExecution && scoreToCheck < threshold)
    );

    if (shouldCreateIncident) {
      await this.createIncident(execution, threshold, isGroupExecution);
      execution.status = ExecutionStatus.LOW_PERFORMANCE;
      await this.executionRepository.save(execution);
    }
  }

  private async createIncident(execution: ChecklistExecutionEntity, threshold: number, isGroupExecution: boolean = false): Promise<void> {
    const incident = new IncidentEntity();
    incident.executionId = execution.id;
    incident.autoGenerated = true;

    const actualScore = isGroupExecution ? (execution.groupScore || execution.percentageScore) : execution.percentageScore;
    const executionType = isGroupExecution ? 'Group' : 'Template';
    const scoreType = isGroupExecution ? 'group score' : 'template score';

    incident.title = `Low Performance ${ executionType } Checklist Execution`;
    incident.description = `Checklist ${ executionType.toLowerCase() } execution scored ${ actualScore.toFixed(2) }% (${ scoreType }) which is below the threshold of ${ threshold }%`;
    incident.severity = this.determineSeverity(actualScore, threshold);
    incident.status = IncidentStatus.OPEN;
    incident.performanceScore = actualScore;
    incident.thresholdScore = threshold;
    incident.vehicleId = execution.targetVehicleId;
    incident.reportedByUserId = execution.executorUserId;
    incident.reportedAt = new Date();
    incident.failedCategories = this.getFailedCategories(execution.categoryScores, threshold);

    await this.incidentRepository.save(incident);
  }

  private determineSeverity(score: number, threshold: number): IncidentSeverity {
    const difference = threshold - score;

    if (difference >= 30) return IncidentSeverity.CRITICAL;
    if (difference >= 20) return IncidentSeverity.HIGH;
    if (difference >= 10) return IncidentSeverity.MEDIUM;
    return IncidentSeverity.LOW;
  }

  private getFailedCategories(categoryScores: Record<string, number>, threshold: number): string[] {
    return Object.entries(categoryScores)
      .filter(([ , score ]) => score < threshold)
      .map(([ categoryId ]) => categoryId);
  }
}
