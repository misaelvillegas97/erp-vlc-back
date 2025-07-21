import { Test, TestingModule }                    from '@nestjs/testing';
import { getRepositoryToken }                     from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository }                             from 'typeorm';

import { ChecklistGroupService }   from './checklist-group.service';
import { ChecklistGroupEntity }    from '../domain/entities/checklist-group.entity';
import { ChecklistTemplateEntity } from '../domain/entities/checklist-template.entity';
import { CreateChecklistGroupDto } from '../domain/dto/create-checklist-group.dto';
import { UpdateChecklistGroupDto } from '../domain/dto/update-checklist-group.dto';
import { QueryChecklistGroupDto }  from '../domain/dto/query-checklist-group.dto';

describe('ChecklistGroupService', () => {
  let service: ChecklistGroupService;
  let mockGroupRepository: jest.Mocked<Repository<ChecklistGroupEntity>>;
  let mockTemplateRepository: jest.Mocked<Repository<ChecklistTemplateEntity>>;

  const mockGroup = {
    id: 'group-id',
    name: 'Test Group',
    description: 'Test Description',
    weight: 1.0,
    vehicleTypes: [ 'TRUCK' ],
    userRoles: [ 'driver' ],
    isActive: true,
    performanceThreshold: 70.0,
    templateWeights: {'template-1': 0.6, 'template-2': 0.4},
    templates: [],
    categories: [],
    executions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as ChecklistGroupEntity;

  const mockTemplate = {
    id: 'template-1',
    name: 'Test Template',
    type: 'inspection' as any,
    description: 'Test Description',
    version: '1.0',
    vehicleTypes: [ 'TRUCK' ],
    userRoles: [ 'driver' ],
    isActive: true,
    performanceThreshold: 70.0,
    categories: [],
    executions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as ChecklistTemplateEntity;

  beforeEach(async () => {
    const mockGroupRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findByIds: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockTemplateRepo = {
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistGroupService,
        {
          provide: getRepositoryToken(ChecklistGroupEntity),
          useValue: mockGroupRepo,
        },
        {
          provide: getRepositoryToken(ChecklistTemplateEntity),
          useValue: mockTemplateRepo,
        },
      ],
    }).compile();

    service = module.get<ChecklistGroupService>(ChecklistGroupService);
    mockGroupRepository = module.get(getRepositoryToken(ChecklistGroupEntity));
    mockTemplateRepository = module.get(getRepositoryToken(ChecklistTemplateEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group successfully with valid template weights', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        description: 'Test Description',
        templateIds: [ 'template-1', 'template-2' ],
        templateWeights: {'template-1': 0.6, 'template-2': 0.4},
      };

      const expectedGroup = {...mockGroup};

      mockTemplateRepository.findByIds.mockResolvedValue([ mockTemplate ]);
      mockGroupRepository.create.mockReturnValue(expectedGroup);
      mockGroupRepository.save.mockResolvedValue(expectedGroup);
      mockGroupRepository.findOne.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await service.createGroup(inputDto);

      // Assert
      expect(actualResult).toEqual(expectedGroup);
      expect(mockTemplateRepository.findByIds).toHaveBeenCalledWith([ 'template-1', 'template-2' ]);
      expect(mockGroupRepository.create).toHaveBeenCalledWith({
        name: inputDto.name,
        description: inputDto.description,
        weight: 1.0,
        vehicleTypes: undefined,
        userRoles: undefined,
        isActive: true,
        performanceThreshold: 70.0,
        templateWeights: inputDto.templateWeights,
      });
    });

    it('should throw BadRequestException when template weights do not sum to 1', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        templateIds: [ 'template-1', 'template-2' ],
        templateWeights: {'template-1': 0.7, 'template-2': 0.4}, // Sum = 1.1
      };

      mockTemplateRepository.findByIds.mockResolvedValue([ mockTemplate ]);

      // Act & Assert
      await expect(service.createGroup(inputDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when template IDs do not exist', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        templateIds: [ 'non-existent-template' ],
        templateWeights: {'non-existent-template': 1.0},
      };

      mockTemplateRepository.findByIds.mockResolvedValue([]);

      // Act & Assert
      await expect(service.createGroup(inputDto)).rejects.toThrow(
        new BadRequestException('Templates not found: non-existent-template')
      );
    });

    it('should throw BadRequestException when template weights are missing', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        templateIds: [ 'template-1' ],
        // templateWeights missing
      };

      mockTemplateRepository.findByIds.mockResolvedValue([ mockTemplate ]);

      // Act & Assert
      await expect(service.createGroup(inputDto)).rejects.toThrow(
        new BadRequestException('Template weights must be provided when templates are specified')
      );
    });
  });

  describe('findById', () => {
    it('should return group when found', async () => {
      // Arrange
      const expectedGroup = {...mockGroup};
      mockGroupRepository.findOne.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await service.findById('group-id');

      // Assert
      expect(actualResult).toEqual(expectedGroup);
      expect(mockGroupRepository.findOne).toHaveBeenCalledWith({
        where: {id: 'group-id'},
        relations: [ 'templates', 'categories', 'executions' ]
      });
    });

    it('should throw NotFoundException when group not found', async () => {
      // Arrange
      mockGroupRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        new NotFoundException('Checklist group with ID non-existent-id not found')
      );
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully', async () => {
      // Arrange
      const updateDto: UpdateChecklistGroupDto = {
        name: 'Updated Group Name',
        description: 'Updated Description',
      };

      const existingGroup = {...mockGroup};
      const updatedGroup = {...mockGroup, ...updateDto};

      mockGroupRepository.findOne.mockResolvedValue(existingGroup);
      mockGroupRepository.save.mockResolvedValue(updatedGroup);

      // Act
      const actualResult = await service.updateGroup('group-id', updateDto);

      // Assert
      expect(actualResult).toEqual(updatedGroup);
      expect(mockGroupRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: updateDto.name,
        description: updateDto.description,
      }));
    });

    it('should validate template weights when updating templates', async () => {
      // Arrange
      const updateDto: UpdateChecklistGroupDto = {
        templateIds: [ 'template-1' ],
        templateWeights: {'template-1': 0.8}, // Invalid sum
      };

      const existingGroup = {...mockGroup};
      mockGroupRepository.findOne.mockResolvedValue(existingGroup);
      mockTemplateRepository.findByIds.mockResolvedValue([ mockTemplate ]);

      // Act & Assert
      await expect(service.updateGroup('group-id', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully when no executions exist', async () => {
      // Arrange
      const groupWithoutExecutions = {...mockGroup, executions: []};
      mockGroupRepository.findOne.mockResolvedValue(groupWithoutExecutions);
      mockGroupRepository.remove.mockResolvedValue(groupWithoutExecutions);

      // Act
      await service.deleteGroup('group-id');

      // Assert
      expect(mockGroupRepository.remove).toHaveBeenCalledWith(groupWithoutExecutions);
    });

    it('should throw BadRequestException when group has executions', async () => {
      // Arrange
      const groupWithExecutions = {
        ...mockGroup,
        executions: [ {id: 'execution-1'} as any ]
      };
      mockGroupRepository.findOne.mockResolvedValue(groupWithExecutions);

      // Act & Assert
      await expect(service.deleteGroup('group-id')).rejects.toThrow(
        new BadRequestException('Cannot delete group with existing executions')
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      // Arrange
      const query: QueryChecklistGroupDto = {
        name: 'Test',
        isActive: true,
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([ [ mockGroup ], 1 ]),
      };

      mockGroupRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const actualResult = await service.findAll(query);

      // Assert
      expect(actualResult).toEqual([ [ mockGroup ], 1 ]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('group.name ILIKE :name', {name: '%Test%'});
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('group.isActive = :isActive', {isActive: true});
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('deactivateGroup', () => {
    it('should deactivate group successfully', async () => {
      // Arrange
      const activeGroup = {...mockGroup, isActive: true};
      const deactivatedGroup = {...mockGroup, isActive: false};

      mockGroupRepository.findOne.mockResolvedValue(activeGroup);
      mockGroupRepository.save.mockResolvedValue(deactivatedGroup);

      // Act
      const actualResult = await service.deactivateGroup('group-id');

      // Assert
      expect(actualResult.isActive).toBe(false);
      expect(mockGroupRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isActive: false,
      }));
    });
  });
});
