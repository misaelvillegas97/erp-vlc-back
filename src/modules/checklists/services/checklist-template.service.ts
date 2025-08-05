import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }                                   from '@nestjs/typeorm';
import { Repository }                                         from 'typeorm';
import { ChecklistTemplateEntity }                            from '../domain/entities/checklist-template.entity';
import { CategoryEntity }                                     from '../domain/entities/category.entity';
import { QuestionEntity }                                     from '../domain/entities/question.entity';
import { CreateChecklistTemplateDto }                         from '../domain/dto/create-checklist-template.dto';
import { TargetType }                                         from '../domain/enums/target-type.enum';
import { CreateCategoryDto }                                  from '../domain/dto/create-category.dto';

export interface QueryChecklistTemplateDto {
  type?: string;
  isActive?: boolean;
  targetTypes?: TargetType[];
  userRoles?: string[];
  page?: number;
  limit?: number;
}

@Injectable()
export class ChecklistTemplateService {
  constructor(
    @InjectRepository(ChecklistTemplateEntity)
    private readonly templateRepository: Repository<ChecklistTemplateEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
  ) {}

  /**
   * Create a new checklist template with nested categories and questions
   */
  async createTemplate(dto: CreateChecklistTemplateDto): Promise<ChecklistTemplateEntity> {
    const template = new ChecklistTemplateEntity();
    template.type = dto.type;
    template.name = dto.name;
    template.description = dto.description;
    template.version = dto.version || '1.0';
    template.targetTypes = dto.targetTypes || [];
    template.userRoles = dto.userRoles || [];
    template.isActive = dto.isActive !== undefined ? dto.isActive : true;
    template.performanceThreshold = dto.performanceThreshold || 70.0;

    const savedTemplate = await this.templateRepository.save(template);

    // Create categories and questions if provided
    if (dto.categories && dto.categories.length > 0) {
      await this.createCategoriesWithQuestions(savedTemplate.id, dto.categories);
    }

    // Validate hierarchical weight integrity after template is created with categories/questions
    await this.validateHierarchicalWeightIntegrity(savedTemplate.id);

    // Return the complete template with relations
    return this.findById(savedTemplate.id);
  }

  /**
   * Create categories with their questions for a template
   */
  private async createCategoriesWithQuestions(templateId: string, categoriesDto: CreateCategoryDto[]): Promise<void> {
    for (const categoryDto of categoriesDto) {
      // Create category
      const category = new CategoryEntity();
      category.title = categoryDto.title;
      category.description = categoryDto.description;
      category.sortOrder = categoryDto.sortOrder || 0;
      category.templateId = templateId;

      const savedCategory = await this.categoryRepository.save(category);

      // Create questions for this category if provided
      if (categoryDto.questions && categoryDto.questions.length > 0) {
        for (const questionDto of categoryDto.questions) {
          const question = new QuestionEntity();
          question.title = questionDto.title;
          question.description = questionDto.description;
          question.weight = questionDto.weight;
          question.required = questionDto.required;
          question.hasIntermediateApproval = questionDto.hasIntermediateApproval;
          question.intermediateValue = questionDto.intermediateValue;
          question.extraFields = questionDto.extraFields || {};
          question.sortOrder = questionDto.sortOrder || 0;
          question.isActive = questionDto.isActive !== undefined ? questionDto.isActive : true;
          question.categoryId = savedCategory.id;

          await this.questionRepository.save(question);
        }
      }
    }
  }

  /**
   * Find all templates with filtering and pagination
   */
  async findAll(query: QueryChecklistTemplateDto): Promise<[ ChecklistTemplateEntity[], number ]> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('template.deletedAt IS NULL');

    if (query.type) {
      queryBuilder.andWhere('template.type = :type', {type: query.type});
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {isActive: query.isActive});
    }

    if (query.targetTypes && query.targetTypes.length > 0) {
      queryBuilder.andWhere('template.targetTypes && :targetTypes', {targetTypes: query.targetTypes});
    }

    if (query.userRoles && query.userRoles.length > 0) {
      queryBuilder.andWhere('template.userRoles && :userRoles', {userRoles: query.userRoles});
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .orderBy('template.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Find template by ID with relations
   */
  async findById(id: string): Promise<ChecklistTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: {id},
      relations: [
        'categories',
        'categories.questions',
        'executions'
      ]
    });

    if (!template) {
      throw new NotFoundException(`Checklist template with ID ${ id } not found`);
    }

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, dto: Partial<CreateChecklistTemplateDto>): Promise<ChecklistTemplateEntity> {
    const template = await this.findById(id);

    if (dto.type !== undefined) template.type = dto.type;
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.version !== undefined) template.version = dto.version;
    if (dto.targetTypes !== undefined) template.targetTypes = dto.targetTypes;
    if (dto.userRoles !== undefined) template.userRoles = dto.userRoles;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    if (dto.performanceThreshold !== undefined) template.performanceThreshold = dto.performanceThreshold;

    const updatedTemplate = await this.templateRepository.save(template);

    // Validate hierarchical weight integrity after update
    await this.validateHierarchicalWeightIntegrity(updatedTemplate.id);

    return updatedTemplate;
  }

  /**
   * Delete a template (soft delete)
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // Verify template exists

    // Check if template has any executions
    const executionCount = await this.templateRepository
      .createQueryBuilder('template')
      .leftJoin('template.executions', 'executions')
      .where('template.id = :id', {id})
      .getCount();

    if (executionCount > 0) {
      throw new BadRequestException('Cannot delete template that has been executed. Consider deactivating it instead.');
    }

    await this.templateRepository.softDelete(id);
  }

  /**
   * Duplicate a template with all its categories and questions
   */
  async duplicate(id: string, newName?: string): Promise<ChecklistTemplateEntity> {
    const originalTemplate = await this.findById(id);

    // Create new template
    const duplicatedTemplate = new ChecklistTemplateEntity();
    duplicatedTemplate.type = originalTemplate.type;
    duplicatedTemplate.name = newName || `${ originalTemplate.name } (Copy)`;
    duplicatedTemplate.description = originalTemplate.description;
    duplicatedTemplate.version = '1.0'; // Reset version for duplicated template
    duplicatedTemplate.targetTypes = [ ...(originalTemplate.targetTypes || []) ];
    duplicatedTemplate.userRoles = [ ...(originalTemplate.userRoles || []) ];
    duplicatedTemplate.isActive = false; // Start as inactive
    duplicatedTemplate.performanceThreshold = originalTemplate.performanceThreshold;

    const savedTemplate = await this.templateRepository.save(duplicatedTemplate);

    // Duplicate categories and questions
    for (const originalCategory of originalTemplate.categories) {
      const duplicatedCategory = new CategoryEntity();
      duplicatedCategory.title = originalCategory.title;
      duplicatedCategory.description = originalCategory.description;
      duplicatedCategory.sortOrder = originalCategory.sortOrder;
      duplicatedCategory.templateId = savedTemplate.id;

      const savedCategory = await this.categoryRepository.save(duplicatedCategory);

      // Duplicate questions
      for (const originalQuestion of originalCategory.questions) {
        const duplicatedQuestion = new QuestionEntity();
        duplicatedQuestion.title = originalQuestion.title;
        duplicatedQuestion.description = originalQuestion.description;
        duplicatedQuestion.weight = originalQuestion.weight;
        duplicatedQuestion.required = originalQuestion.required;
        duplicatedQuestion.hasIntermediateApproval = originalQuestion.hasIntermediateApproval;
        duplicatedQuestion.intermediateValue = originalQuestion.intermediateValue;
        duplicatedQuestion.extraFields = originalQuestion.extraFields ? {...originalQuestion.extraFields} : null;
        duplicatedQuestion.sortOrder = originalQuestion.sortOrder;
        duplicatedQuestion.isActive = originalQuestion.isActive;
        duplicatedQuestion.categoryId = savedCategory.id;

        await this.questionRepository.save(duplicatedQuestion);
      }
    }

    return this.findById(savedTemplate.id);
  }

  /**
   * Activate or deactivate a template
   */
  async toggleActive(id: string): Promise<ChecklistTemplateEntity> {
    const template = await this.findById(id);
    template.isActive = !template.isActive;
    return this.templateRepository.save(template);
  }

  /**
   * Get template statistics
   */
  async getStatistics(id: string): Promise<{
    totalCategories: number;
    totalQuestions: number;
    requiredQuestions: number;
    executionCount: number;
    averageScore: number;
  }> {
    const template = await this.findById(id);

    const totalCategories = template.categories.length;
    const totalQuestions = template.categories.reduce((sum, category) => sum + category.questions.length, 0);
    const requiredQuestions = template.categories.reduce(
      (sum, category) => sum + category.questions.filter(q => q.required).length,
      0
    );

    // Get execution statistics
    const executionStats = await this.templateRepository
      .createQueryBuilder('template')
      .leftJoin('template.executions', 'executions')
      .select('COUNT(executions.id)', 'executionCount')
      .addSelect('AVG(executions.percentageScore)', 'averageScore')
      .where('template.id = :id', {id})
      .andWhere('executions.status = :status', {status: 'completed'})
      .getRawOne();

    return {
      totalCategories,
      totalQuestions,
      requiredQuestions,
      executionCount: parseInt(executionStats.executionCount) || 0,
      averageScore: parseFloat(executionStats.averageScore) || 0
    };
  }

  /**
   * Find templates by target type and user role
   */
  async findByFilters(targetType?: TargetType, userRole?: string): Promise<ChecklistTemplateEntity[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.categories', 'categories')
      .leftJoinAndSelect('categories.questions', 'questions')
      .where('template.isActive = :isActive', {isActive: true})
      .andWhere('template.deletedAt IS NULL');

    if (targetType) {
      queryBuilder.andWhere(':targetType = ANY(template.targetTypes)', {targetType});
    }

    if (userRole) {
      queryBuilder.andWhere(':userRole = ANY(template.userRoles)', {userRole});
    }

    return queryBuilder
      .orderBy('template.name', 'ASC')
      .getMany();
  }

  /**
   * Validates hierarchical weight integrity for a template
   * Ensures questions within each category meet minimum weight requirements
   */
  private async validateHierarchicalWeightIntegrity(templateId: string): Promise<void> {
    const template = await this.findById(templateId);

    if (!template.categories || template.categories.length === 0) {
      return; // No categories to validate
    }

    // Only validate questions, NOT categories (free weight system)
    for (const category of template.categories) {
      if (category.questions && category.questions.length > 0) {
        this.validateQuestionWeights(category.questions, category.id);
      }
    }
  }


  /**
   * Validates that question weights meet minimum requirements (0.1 minimum)
   */
  private validateQuestionWeights(questions: QuestionEntity[], categoryId: string): void {
    if (!questions || questions.length === 0) {
      return;
    }

    // Validate that each question has minimum weight of 0.1
    const invalidWeights = questions.filter(q => Number(q.weight) < 0.1);
    if (invalidWeights.length > 0) {
      throw new BadRequestException(
        `Questions must have minimum weight of 0.1 in category ${ categoryId }`
      );
    }
  }

  /**
   * Validates weight integrity for a specific category and its questions
   */
  async validateCategoryWeightIntegrity(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: {id: categoryId},
      relations: [ 'questions' ]
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${ categoryId } not found`);
    }

    if (category.questions && category.questions.length > 0) {
      this.validateQuestionWeights(category.questions, categoryId);
    }
  }
}
