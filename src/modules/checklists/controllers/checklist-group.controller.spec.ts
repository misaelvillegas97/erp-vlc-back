import { Test, TestingModule }                    from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ChecklistGroupController } from './checklist-group.controller';
import { ChecklistGroupService }    from '../services/checklist-group.service';
import { ChecklistGroupEntity }     from '../domain/entities/checklist-group.entity';
import { CreateChecklistGroupDto }  from '../domain/dto/create-checklist-group.dto';
import { UpdateChecklistGroupDto }  from '../domain/dto/update-checklist-group.dto';
import { QueryChecklistGroupDto }   from '../domain/dto/query-checklist-group.dto';

describe('ChecklistGroupController', () => {
  let controller: ChecklistGroupController;
  let mockGroupService: jest.Mocked<ChecklistGroupService>;

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

  beforeEach(async () => {
    const mockService = {
      createGroup: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      deactivateGroup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ ChecklistGroupController ],
      providers: [
        {
          provide: ChecklistGroupService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ChecklistGroupController>(ChecklistGroupController);
    mockGroupService = module.get(ChecklistGroupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group successfully', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        description: 'Test Description',
        templateIds: [ 'template-1', 'template-2' ],
        templateWeights: {'template-1': 0.6, 'template-2': 0.4},
      };

      const expectedGroup = {...mockGroup};
      mockGroupService.createGroup.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await controller.createGroup(inputDto);

      // Assert
      expect(actualResult).toEqual(expectedGroup);
      expect(mockGroupService.createGroup).toHaveBeenCalledWith(inputDto);
    });

    it('should handle BadRequestException from service', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        templateIds: [ 'template-1' ],
        templateWeights: {'template-1': 0.8}, // Invalid weight
      };

      mockGroupService.createGroup.mockRejectedValue(
        new BadRequestException('Template weights must sum to 1.0')
      );

      // Act & Assert
      await expect(controller.createGroup(inputDto)).rejects.toThrow(BadRequestException);
      expect(mockGroupService.createGroup).toHaveBeenCalledWith(inputDto);
    });
  });

  describe('findAllGroups', () => {
    it('should return paginated groups', async () => {
      // Arrange
      const query: QueryChecklistGroupDto = {
        page: 1,
        limit: 10,
        isActive: true,
      };

      const expectedGroups = [ mockGroup ];
      const expectedTotal = 1;
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, expectedTotal ]);

      // Act
      const actualResult = await controller.findAllGroups(query);

      // Assert
      expect(actualResult).toEqual({
        total: expectedTotal,
        items: expectedGroups,
      });
      expect(mockGroupService.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: QueryChecklistGroupDto = {};
      mockGroupService.findAll.mockResolvedValue([ [], 0 ]);

      // Act
      const actualResult = await controller.findAllGroups(query);

      // Assert
      expect(actualResult).toEqual({
        total: 0,
        items: [],
      });
    });
  });

  describe('findGroupById', () => {
    it('should return group when found', async () => {
      // Arrange
      const expectedGroup = {...mockGroup};
      mockGroupService.findById.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await controller.findGroupById('group-id');

      // Assert
      expect(actualResult).toEqual(expectedGroup);
      expect(mockGroupService.findById).toHaveBeenCalledWith('group-id');
    });

    it('should handle NotFoundException from service', async () => {
      // Arrange
      mockGroupService.findById.mockRejectedValue(
        new NotFoundException('Checklist group with ID non-existent-id not found')
      );

      // Act & Assert
      await expect(controller.findGroupById('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockGroupService.findById).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully', async () => {
      // Arrange
      const updateDto: UpdateChecklistGroupDto = {
        name: 'Updated Group Name',
        description: 'Updated Description',
      };

      const expectedGroup = {...mockGroup, ...updateDto};
      mockGroupService.updateGroup.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await controller.updateGroup('group-id', updateDto);

      // Assert
      expect(actualResult).toEqual(expectedGroup);
      expect(mockGroupService.updateGroup).toHaveBeenCalledWith('group-id', updateDto);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const updateDto: UpdateChecklistGroupDto = {
        templateIds: [ 'template-1' ],
        templateWeights: {'template-1': 0.8}, // Invalid weight
      };

      mockGroupService.updateGroup.mockRejectedValue(
        new BadRequestException('Template weights must sum to 1.0')
      );

      // Act & Assert
      await expect(controller.updateGroup('group-id', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      // Arrange
      mockGroupService.deleteGroup.mockResolvedValue();

      // Act
      await controller.deleteGroup('group-id');

      // Assert
      expect(mockGroupService.deleteGroup).toHaveBeenCalledWith('group-id');
    });

    it('should handle BadRequestException when group has executions', async () => {
      // Arrange
      mockGroupService.deleteGroup.mockRejectedValue(
        new BadRequestException('Cannot delete group with existing executions')
      );

      // Act & Assert
      await expect(controller.deleteGroup('group-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivateGroup', () => {
    it('should deactivate group successfully', async () => {
      // Arrange
      const deactivatedGroup = {...mockGroup, isActive: false};
      mockGroupService.deactivateGroup.mockResolvedValue(deactivatedGroup);

      // Act
      const actualResult = await controller.deactivateGroup('group-id');

      // Assert
      expect(actualResult).toEqual(deactivatedGroup);
      expect(actualResult.isActive).toBe(false);
      expect(mockGroupService.deactivateGroup).toHaveBeenCalledWith('group-id');
    });
  });

  describe('findGroupsByTemplate', () => {
    it('should return groups containing specific template', async () => {
      // Arrange
      const templateId = 'template-1';
      const expectedGroups = [ mockGroup ];
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, 1 ]);

      // Act
      const actualResult = await controller.findGroupsByTemplate(templateId);

      // Assert
      expect(actualResult).toEqual(expectedGroups);
      expect(mockGroupService.findAll).toHaveBeenCalledWith({
        templateId,
        includeTemplates: true,
      });
    });
  });

  describe('findActiveGroups', () => {
    it('should return only active groups', async () => {
      // Arrange
      const expectedGroups = [ mockGroup ];
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, 1 ]);

      // Act
      const actualResult = await controller.findActiveGroups();

      // Assert
      expect(actualResult).toEqual(expectedGroups);
      expect(mockGroupService.findAll).toHaveBeenCalledWith({
        isActive: true,
      });
    });
  });

  describe('findGroupsByVehicleType', () => {
    it('should return groups for specific vehicle type', async () => {
      // Arrange
      const vehicleType = 'TRUCK';
      const expectedGroups = [ mockGroup ];
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, 1 ]);

      // Act
      const actualResult = await controller.findGroupsByVehicleType(vehicleType);

      // Assert
      expect(actualResult).toEqual(expectedGroups);
      expect(mockGroupService.findAll).toHaveBeenCalledWith({
        vehicleType,
        isActive: true,
      });
    });
  });

  describe('findGroupsByUserRole', () => {
    it('should return groups for specific user role', async () => {
      // Arrange
      const userRole = 'driver';
      const expectedGroups = [ mockGroup ];
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, 1 ]);

      // Act
      const actualResult = await controller.findGroupsByUserRole(userRole);

      // Assert
      expect(actualResult).toEqual(expectedGroups);
      expect(mockGroupService.findAll).toHaveBeenCalledWith({
        userRole,
        isActive: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
      };

      mockGroupService.createGroup.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(controller.createGroup(inputDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle NotFoundException in findById', async () => {
      // Arrange
      mockGroupService.findById.mockRejectedValue(
        new NotFoundException('Checklist group with ID invalid-id not found')
      );

      // Act & Assert
      await expect(controller.findGroupById('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle BadRequestException in updateGroup', async () => {
      // Arrange
      const updateDto: UpdateChecklistGroupDto = {
        templateIds: [ 'invalid-template' ],
        templateWeights: {'invalid-template': 1.0},
      };

      mockGroupService.updateGroup.mockRejectedValue(
        new BadRequestException('Templates not found: invalid-template')
      );

      // Act & Assert
      await expect(controller.updateGroup('group-id', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex filtering in findAll', async () => {
      // Arrange
      const complexQuery: QueryChecklistGroupDto = {
        name: 'Safety',
        isActive: true,
        vehicleType: 'TRUCK',
        userRole: 'driver',
        minPerformanceThreshold: 60,
        maxPerformanceThreshold: 90,
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'ASC',
        includeTemplates: true,
        includeCategories: false,
      };

      const expectedGroups = [ mockGroup ];
      mockGroupService.findAll.mockResolvedValue([ expectedGroups, 1 ]);

      // Act
      const actualResult = await controller.findAllGroups(complexQuery);

      // Assert
      expect(actualResult).toEqual({
        total: 1,
        items: expectedGroups,
      });
      expect(mockGroupService.findAll).toHaveBeenCalledWith(complexQuery);
    });

    it('should handle empty template weights in create', async () => {
      // Arrange
      const inputDto: CreateChecklistGroupDto = {
        name: 'Test Group',
        templateIds: [],
        templateWeights: {},
      };

      const expectedGroup = {...mockGroup, templateWeights: {}};
      mockGroupService.createGroup.mockResolvedValue(expectedGroup);

      // Act
      const actualResult = await controller.createGroup(inputDto);

      // Assert
      expect(actualResult).toEqual(expectedGroup);
    });
  });
});
