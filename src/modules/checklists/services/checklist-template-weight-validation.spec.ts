import { Test, TestingModule }                    from '@nestjs/testing';
import { getRepositoryToken }                     from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository }                             from 'typeorm';

import { ChecklistTemplateService }   from './checklist-template.service';
import { ChecklistTemplateEntity }    from '../domain/entities/checklist-template.entity';
import { CategoryEntity }             from '../domain/entities/category.entity';
import { QuestionEntity }             from '../domain/entities/question.entity';
import { CreateChecklistTemplateDto } from '../domain/dto/create-checklist-template.dto';
import { ChecklistType }              from '../domain/enums/checklist-type.enum';

describe('ChecklistTemplateService - Weight Validation', () => {
  let service: ChecklistTemplateService;
  let mockTemplateRepository: jest.Mocked<Repository<ChecklistTemplateEntity>>;
  let mockCategoryRepository: jest.Mocked<Repository<CategoryEntity>>;

  const createMockTemplate = (categories: Partial<CategoryEntity>[] = []) => ({
    id: 'template-id',
    name: 'Test Template',
    type: ChecklistType.INSPECTION,
    description: 'Test Description',
    version: '1.0',
    vehicleTypes: [ 'TRUCK' ],
    userRoles: [ 'driver' ],
    isActive: true,
    performanceThreshold: 70.0,
    categories,
    executions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Partial<ChecklistTemplateEntity>);

  const createMockCategory = (id: string, weight: number, questions: Partial<QuestionEntity>[] = []) => ({
    id,
    title: `Category ${ id }`,
    description: 'Test Category',
    weight,
    sortOrder: 0,
    templateId: 'template-id',
    template: null,
    groupId: null,
    group: null,
    questions,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Partial<CategoryEntity>);

  const createMockQuestion = (id: string, weight: number) => ({
    id,
    title: `Question ${ id }`,
    description: 'Test Question',
    weight,
    required: false,
    options: null,
    extraFields: null,
    sortOrder: 0,
    isActive: true,
    categoryId: 'category-id',
    category: null,
    answers: [],
    hasIntermediateApproval: false,
    intermediateValue: 0.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Partial<QuestionEntity>);

  beforeEach(async () => {
    const mockTemplateRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCategoryRepo = {
      findOne: jest.fn(),
    };

    const mockQuestionRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistTemplateService,
        {
          provide: getRepositoryToken(ChecklistTemplateEntity),
          useValue: mockTemplateRepo,
        },
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(QuestionEntity),
          useValue: mockQuestionRepo,
        },
      ],
    }).compile();

    service = module.get<ChecklistTemplateService>(ChecklistTemplateService);
    mockTemplateRepository = module.get(getRepositoryToken(ChecklistTemplateEntity));
    mockCategoryRepository = module.get(getRepositoryToken(CategoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHierarchicalWeightIntegrity', () => {
    it('should pass validation when all questions have minimum weight 0.1', async () => {
      // Arrange
      const questions1 = [
        createMockQuestion('q1', 0.6),
        createMockQuestion('q2', 0.4),
      ];
      const questions2 = [
        createMockQuestion('q3', 1.0),
      ];

      const categories = [
        createMockCategory('cat1', 0.7, questions1),
        createMockCategory('cat2', 0.3, questions2),
      ];

      const template = createMockTemplate(categories);
      mockTemplateRepository.findOne.mockResolvedValue(template as ChecklistTemplateEntity);

      // Act & Assert
      await expect(service['validateHierarchicalWeightIntegrity']('template-id')).resolves.not.toThrow();
    });

    it('should throw BadRequestException when questions have weight below 0.1', async () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.05), // Below minimum
        createMockQuestion('q2', 0.5),
      ];

      const categories = [
        createMockCategory('cat1', 1.0, questions),
      ];

      const template = createMockTemplate(categories);
      mockTemplateRepository.findOne.mockResolvedValue(template as ChecklistTemplateEntity);

      // Act & Assert
      await expect(service['validateHierarchicalWeightIntegrity']('template-id'))
        .rejects.toThrow(new BadRequestException('Questions must have minimum weight of 0.1 in category cat1'));
    });

    it('should pass validation with questions having various free weights', async () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.1), // Minimum weight
        createMockQuestion('q2', 2.5), // Free weight
        createMockQuestion('q3', 0.75), // Any weight >= 0.1
      ];

      const categories = [
        createMockCategory('cat1', 1.0, questions),
      ];

      const template = createMockTemplate(categories);
      mockTemplateRepository.findOne.mockResolvedValue(template as ChecklistTemplateEntity);

      // Act & Assert
      await expect(service['validateHierarchicalWeightIntegrity']('template-id')).resolves.not.toThrow();
    });

    it('should handle empty categories gracefully', async () => {
      // Arrange
      const template = createMockTemplate([]);
      mockTemplateRepository.findOne.mockResolvedValue(template as ChecklistTemplateEntity);

      // Act & Assert
      await expect(service['validateHierarchicalWeightIntegrity']('template-id')).resolves.not.toThrow();
    });

    it('should handle categories with no questions gracefully', async () => {
      // Arrange
      const categories = [
        createMockCategory('cat1', 0.5, []),
        createMockCategory('cat2', 0.5, []),
      ];

      const template = createMockTemplate(categories);
      mockTemplateRepository.findOne.mockResolvedValue(template as ChecklistTemplateEntity);

      // Act & Assert
      await expect(service['validateHierarchicalWeightIntegrity']('template-id')).resolves.not.toThrow();
    });
  });


  describe('validateQuestionWeights', () => {
    it('should pass validation when all questions have minimum weight 0.1', () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.3),
        createMockQuestion('q2', 2.7), // Free weight, no need to sum to 1
      ] as QuestionEntity[];

      // Act & Assert
      expect(() => service['validateQuestionWeights'](questions, 'category-id')).not.toThrow();
    });

    it('should throw BadRequestException when question weight is below 0.1', () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.05), // Below minimum
      ] as QuestionEntity[];

      // Act & Assert
      expect(() => service['validateQuestionWeights'](questions, 'category-id'))
        .toThrow(new BadRequestException('Questions must have minimum weight of 0.1 in category category-id'));
    });

    it('should handle empty questions array', () => {
      // Act & Assert
      expect(() => service['validateQuestionWeights']([], 'category-id')).not.toThrow();
    });

    it('should handle null questions', () => {
      // Act & Assert
      expect(() => service['validateQuestionWeights'](null, 'category-id')).not.toThrow();
    });

    it('should handle single question with any weight >= 0.1', () => {
      // Arrange
      const questions = [ createMockQuestion('q1', 5.0) ] as QuestionEntity[]; // Free weight

      // Act & Assert
      expect(() => service['validateQuestionWeights'](questions, 'category-id')).not.toThrow();
    });
  });

  describe('validateCategoryWeightIntegrity', () => {
    it('should validate category and its questions successfully', async () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.5),
        createMockQuestion('q2', 0.5),
      ] as QuestionEntity[];

      const category = createMockCategory('category-id', 1.0, questions) as CategoryEntity;
      mockCategoryRepository.findOne.mockResolvedValue(category);

      // Act & Assert
      await expect(service.validateCategoryWeightIntegrity('category-id')).resolves.not.toThrow();
      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: {id: 'category-id'},
        relations: [ 'questions' ]
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      mockCategoryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateCategoryWeightIntegrity('non-existent-id'))
        .rejects.toThrow(new NotFoundException('Category with ID non-existent-id not found'));
    });

    it('should throw BadRequestException when question weights are below minimum', async () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.05), // Below minimum 0.1
        createMockQuestion('q2', 0.5),
      ];

      const category = createMockCategory('category-id', 1.0, questions) as CategoryEntity;
      mockCategoryRepository.findOne.mockResolvedValue(category);

      // Act & Assert
      await expect(service.validateCategoryWeightIntegrity('category-id'))
        .rejects.toThrow(new BadRequestException('Questions must have minimum weight of 0.1 in category category-id'));
    });

    it('should handle category with no questions', async () => {
      // Arrange
      const category = createMockCategory('category-id', 1.0, []) as CategoryEntity;
      mockCategoryRepository.findOne.mockResolvedValue(category);

      // Act & Assert
      await expect(service.validateCategoryWeightIntegrity('category-id')).resolves.not.toThrow();
    });
  });

  describe('Integration with createTemplate and updateTemplate', () => {
    it('should call weight validation during template creation', async () => {
      // Arrange
      const dto: CreateChecklistTemplateDto = {
        type: ChecklistType.INSPECTION,
        name: 'Test Template',
        description: 'Test Description',
      };

      const savedTemplate = createMockTemplate([]) as ChecklistTemplateEntity;
      mockTemplateRepository.save.mockResolvedValue(savedTemplate);
      mockTemplateRepository.findOne.mockResolvedValue(savedTemplate);

      const validateSpy = jest.spyOn(service as any, 'validateHierarchicalWeightIntegrity').mockResolvedValue(null);

      // Act
      await service.createTemplate(dto);

      // Assert
      expect(validateSpy).toHaveBeenCalledWith(savedTemplate.id);
    });

    it('should call weight validation during template update', async () => {
      // Arrange
      const existingTemplate = createMockTemplate([]) as ChecklistTemplateEntity;
      const updatedTemplate = {...existingTemplate, name: 'Updated Template'} as ChecklistTemplateEntity;

      mockTemplateRepository.findOne.mockResolvedValue(existingTemplate);
      mockTemplateRepository.save.mockResolvedValue(updatedTemplate);

      const validateSpy = jest.spyOn(service as any, 'validateHierarchicalWeightIntegrity').mockResolvedValue(null);

      // Act
      await service.updateTemplate('template-id', {name: 'Updated Template'});

      // Assert
      expect(validateSpy).toHaveBeenCalledWith(updatedTemplate.id);
    });

    it('should propagate validation errors during template creation', async () => {
      // Arrange
      const dto: CreateChecklistTemplateDto = {
        type: ChecklistType.INSPECTION,
        name: 'Test Template',
      };

      const savedTemplate = createMockTemplate([]) as ChecklistTemplateEntity;
      mockTemplateRepository.save.mockResolvedValue(savedTemplate);

      jest.spyOn(service as any, 'validateHierarchicalWeightIntegrity')
        .mockRejectedValue(new BadRequestException('Questions must have minimum weight of 0.1'));

      // Act & Assert
      await expect(service.createTemplate(dto))
        .rejects.toThrow(new BadRequestException('Questions must have minimum weight of 0.1'));
    });
  });

  describe('Edge Cases and Precision', () => {
    it('should handle zero weights as invalid (below minimum)', () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.0), // Below minimum 0.1
        createMockQuestion('q2', 1.0),
      ] as QuestionEntity[];

      // Act & Assert
      expect(() => service['validateQuestionWeights'](questions, 'category-id'))
        .toThrow(new BadRequestException('Questions must have minimum weight of 0.1 in category category-id'));
    });

    it('should handle minimum weight boundary correctly', () => {
      // Arrange
      const questions = [
        createMockQuestion('q1', 0.1), // Exactly minimum
        createMockQuestion('q2', 0.1000001), // Just above minimum
      ] as QuestionEntity[];

      // Act & Assert
      expect(() => service['validateQuestionWeights'](questions, 'category-id')).not.toThrow();
    });
  });
});
