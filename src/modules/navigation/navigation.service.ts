import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { In, IsNull, Repository }        from 'typeorm';
import { NavigationItemEntity }          from './domain/entities/navigation-item.entity';
import { CreateNavigationItemDto }       from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto }       from './dto/update-navigation-item.dto';
import { NavigationItemResponseDto }     from './dto/navigation-item-response.dto';
import { RoleEntity }                    from '@modules/roles/domain/entities/role.entity';
import { FeatureToggleEntity }           from '@modules/config/domain/entities/feature-toggle.entity';

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationItemEntity)
    private navigationItemRepository: Repository<NavigationItemEntity>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    @InjectRepository(FeatureToggleEntity)
    private featureToggleRepository: Repository<FeatureToggleEntity>,
  ) {}

  /**
   * Create a new navigation item
   */
  async create(createDto: CreateNavigationItemDto): Promise<NavigationItemEntity> {
    const navigationItem = this.navigationItemRepository.create(createDto);

    // Set feature toggle if provided
    if (createDto.featureToggleId) {
      const featureToggle = await this.featureToggleRepository.findOne({
        where: {id: createDto.featureToggleId}
      });

      if (featureToggle) {
        navigationItem.featureToggle = featureToggle;
      }
    }

    // Set roles if provided
    if (createDto.roleIds && createDto.roleIds.length > 0) {
      const roles = await this.roleRepository.findBy({
        id: In(createDto.roleIds)
      });

      if (roles.length > 0) {
        navigationItem.roles = roles;
      }
    }

    return this.navigationItemRepository.save(navigationItem);
  }

  /**
   * Find all navigation items
   */
  async findAll(): Promise<NavigationItemEntity[]> {
    return this.navigationItemRepository.find({
      relations: [ 'children', 'children.children', 'children.featureToggle', 'children.roles', 'featureToggle', 'roles' ],
      where: {parent: IsNull()}, // Only get root items
      order: {title: 'ASC'}
    });
  }

  /**
   * Get all navigation items for admin
   */
  async getHierarchy(): Promise<NavigationItemEntity[]> {
    return this.navigationItemRepository.find({
      relations: [ 'children', 'children.children', 'children.featureToggle', 'children.roles', 'featureToggle', 'roles' ],
      where: {parent: IsNull()}
    });
  }

  /**
   * Get navigation items filtered by user roles and feature toggles
   */
  async getNavigationForUser(userRoleIds: number[] = []): Promise<NavigationItemResponseDto[]> {
    const navigationItems = await this.findAll();
    return NavigationItemResponseDto.filterByRolesAndToggles(navigationItems, userRoleIds);
  }

  /**
   * Find a navigation item by ID
   */
  async findOne(id: string): Promise<NavigationItemEntity> {
    return this.navigationItemRepository.findOne({
      where: {id},
      relations: [ 'children', 'featureToggle', 'roles' ]
    });
  }

  /**
   * Update a navigation item
   */
  async update(id: string, updateDto: UpdateNavigationItemDto): Promise<NavigationItemEntity> {
    const navigationItem = await this.findOne(id);

    if (!navigationItem) {
      throw new NotFoundException(`Navigation item with ID ${ id } not found`);
    }

    // Update basic properties
    Object.assign(navigationItem, updateDto);

    // Update feature toggle if provided
    if (updateDto.featureToggleId) {
      const featureToggle = await this.featureToggleRepository.findOne({
        where: {id: updateDto.featureToggleId}
      });

      if (featureToggle) {
        navigationItem.featureToggle = featureToggle;
      }
    }

    // Update roles if provided
    if (updateDto.roleIds) {
      if (updateDto.roleIds.length > 0) {
        const roles = await this.roleRepository.findBy({
          id: In(updateDto.roleIds)
        });

        navigationItem.roles = roles;
      } else {
        navigationItem.roles = [];
      }
    }

    return this.navigationItemRepository.save(navigationItem);
  }

  /**
   * Remove a navigation item
   */
  async remove(id: string): Promise<void> {
    const navigationItem = await this.findOne(id);

    if (!navigationItem) {
      throw new NotFoundException(`Navigation item with ID ${ id } not found`);
    }

    await this.navigationItemRepository.remove(navigationItem);
  }
}
