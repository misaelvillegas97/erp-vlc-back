import { Test, TestingModule }                    from '@nestjs/testing';
import { getRepositoryToken }                     from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ChecklistExecutionService }   from './checklist-execution.service';
import { ChecklistExecutionEntity }    from '../domain/entities/checklist-execution.entity';
import { ChecklistAnswerEntity }       from '../domain/entities/checklist-answer.entity';
import { ChecklistTemplateEntity }     from '../domain/entities/checklist-template.entity';
import { ChecklistGroupEntity }        from '../domain/entities/checklist-group.entity';
import { QuestionEntity }              from '../domain/entities/question.entity';
import { IncidentEntity }              from '../domain/entities/incident.entity';
import { CreateChecklistExecutionDto } from '../domain/dto/create-checklist-execution.dto';
import { ExecutionStatus }             from '../domain/enums/execution-status.enum';
import { ApprovalStatus }              from '../domain/enums/approval-status.enum';

describe('ChecklistExecutionService', () => {
  let service: ChecklistExecutionService;

  const mockExecutionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAnswerRepository = {
    save: jest.fn(),
  };

  const mockTemplateRepository = {
    findOne: jest.fn(),
  };

  const mockGroupRepository = {
    findOne: jest.fn(),
  };

  const mockQuestionRepository = {
    find: jest.fn(),
  };

  const mockIncidentRepository = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistExecutionService,
        {
          provide: getRepositoryToken(ChecklistExecutionEntity),
          useValue: mockExecutionRepository,
        },
        {
          provide: getRepositoryToken(ChecklistAnswerEntity),
          useValue: mockAnswerRepository,
        },
        {
          provide: getRepositoryToken(ChecklistTemplateEntity),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(ChecklistGroupEntity),
          useValue: mockGroupRepository,
        },
        {
          provide: getRepositoryToken(QuestionEntity),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(IncidentEntity),
          useValue: mockIncidentRepository,
        },
      ],
    }).compile();

    service = module.get<ChecklistExecutionService>(ChecklistExecutionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return execution when found', async () => {
      // Arrange
      const mockExecution = {
        id: 'test-id',
        status: ExecutionStatus.COMPLETED,
        percentageScore: 85.5,
      } as ChecklistExecutionEntity;

      mockExecutionRepository.findOne.mockResolvedValue(mockExecution);

      // Act
      const actualResult = await service.findById('test-id');

      // Assert
      expect(actualResult).toEqual(mockExecution);
      expect(mockExecutionRepository.findOne).toHaveBeenCalledWith({
        where: {id: 'test-id'},
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
    });

    it('should throw NotFoundException when execution not found', async () => {
      // Arrange
      mockExecutionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        new NotFoundException('Checklist execution with ID non-existent-id not found')
      );
    });
  });

  describe('executeChecklist', () => {
    it('should throw BadRequestException when neither templateId nor groupId provided', async () => {
      // Arrange
      const inputDto: CreateChecklistExecutionDto = {
        executorUserId: 'user-id',
        targetVehicleId: 'vehicle-id',
        executionTimestamp: '2025-07-17T23:30:00Z',
        answers: [
          {
            questionId: 'question-id',
            approvalStatus: ApprovalStatus.APPROVED,
            approvalValue: 1.0
          }
        ]
      };

      // Act & Assert
      await expect(service.executeChecklist(inputDto)).rejects.toThrow(
        new BadRequestException('Either templateId or groupId must be provided')
      );
    });

    it('should throw BadRequestException when both templateId and groupId provided', async () => {
      // Arrange
      const inputDto: CreateChecklistExecutionDto = {
        templateId: 'template-id',
        groupId: 'group-id',
        executorUserId: 'user-id',
        targetVehicleId: 'vehicle-id',
        executionTimestamp: '2025-07-17T23:30:00Z',
        answers: [
          {
            questionId: 'question-id',
            approvalStatus: ApprovalStatus.APPROVED,
            approvalValue: 1.0
          }
        ]
      };

      // Act & Assert
      await expect(service.executeChecklist(inputDto)).rejects.toThrow(
        new BadRequestException('Cannot provide both templateId and groupId')
      );
    });

    it('should throw BadRequestException when no answers provided', async () => {
      // Arrange
      const inputDto: CreateChecklistExecutionDto = {
        templateId: 'template-id',
        executorUserId: 'user-id',
        targetVehicleId: 'vehicle-id',
        executionTimestamp: '2025-07-17T23:30:00Z',
        answers: []
      };

      // Act & Assert
      await expect(service.executeChecklist(inputDto)).rejects.toThrow(
        new BadRequestException('At least one answer must be provided')
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default pagination', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([ [], 0 ]),
      };

      mockExecutionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const actualResult = await service.findAll({});

      // Assert
      expect(actualResult).toEqual([ [], 0 ]);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([ [], 0 ]),
      };

      mockExecutionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const queryDto = {
        templateId: 'template-id',
        status: ExecutionStatus.COMPLETED,
        page: 2,
        limit: 20
      };

      // Act
      await service.findAll(queryDto);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'execution.templateId = :templateId',
        {templateId: 'template-id'}
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'execution.status = :status',
        {status: ExecutionStatus.COMPLETED}
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });
});
