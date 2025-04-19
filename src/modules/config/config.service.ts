import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { CreateFeatureToggleDto }        from './dto/create-feature-toggle.dto';
import { UpdateFeatureToggleDto }        from './dto/update-feature-toggle.dto';
import { FeatureToggleEntity }           from './domain/entities/feature-toggle.entity';
import { ToggleFeatureDto }              from './dto/toggle-feature.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(FeatureToggleEntity)
    private featureToggleRepository: Repository<FeatureToggleEntity>,
  ) {}

  /**
   * Creates a new feature toggle
   */
  async createFeatureToggle(createDto: CreateFeatureToggleDto): Promise<FeatureToggleEntity> {
    // If parent is provided, check if it exists
    if (createDto.parentId) {
      const parent = await this.featureToggleRepository.findOne({
        where: {id: createDto.parentId},
      });

      if (!parent) {
        throw new NotFoundException(`Parent feature toggle with ID "${ createDto.parentId }" not found`);
      }
    }

    const featureToggle = this.featureToggleRepository.create(createDto);
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Gets all feature toggles with filtering options
   */
  async findAllFeatureToggles(filters: { 
    enabled?: boolean;
    category?: string;
    parentId?: string | null; // null means root level toggles only
  } = {}): Promise<FeatureToggleEntity[]> {
    const query = this.featureToggleRepository.createQueryBuilder('feature');

    // Add relations
    query.leftJoinAndSelect('feature.children', 'children')
      .leftJoinAndSelect('feature.parent', 'parent');
    
    if (filters.enabled !== undefined) {
      query.andWhere('feature.enabled = :enabled', {enabled: filters.enabled});
    }

    if (filters.category) {
      query.andWhere('feature.category = :category', {category: filters.category});
    }

    // Filter by parentId
    if (filters.parentId === null) {
      // Get only root level toggles
      query.andWhere('feature.parentId IS NULL');
    } else if (filters.parentId) {
      // Get only children of specific parent
      query.andWhere('feature.parentId = :parentId', {parentId: filters.parentId});
    }
    
    return query.getMany();
  }

  /**
   * Gets all feature toggles with their hierarchical structure
   */
  async getFeatureHierarchy(): Promise<FeatureToggleEntity[]> {
    // Get all root level toggles (those without parent)
    return await this.featureToggleRepository.find({
      where: {parentId: null},
      relations: [ 'children', 'children.children' ],
    });
  }

  /**
   * Gets a feature toggle by ID
   */
  async findFeatureToggleById(id: string, includeRelations: boolean = false): Promise<FeatureToggleEntity> {
    const options: any = {
      where: {id}
    };

    if (includeRelations) {
      options.relations = [ 'children', 'parent' ];
    }

    const featureToggle = await this.featureToggleRepository.findOne(options);
    
    if (!featureToggle) {
      throw new NotFoundException(`Feature toggle with ID "${ id }" not found`);
    }

    return featureToggle;
  }

  /**
   * Finds a feature toggle by name
   */
  async findFeatureToggleByName(name: string, includeRelations: boolean = false): Promise<FeatureToggleEntity> {
    const options: any = {
      where: {name}
    };

    if (includeRelations) {
      options.relations = [ 'children', 'parent' ];
    }

    const featureToggle = await this.featureToggleRepository.findOne(options);
    
    if (!featureToggle) {
      throw new NotFoundException(`Feature toggle with name "${ name }" not found`);
    }

    return featureToggle;
  }

  /**
   * Checks if a feature toggle is enabled
   * This will respect the hierarchy - if any parent is disabled, this returns false
   */
  async isFeatureEnabled(name: string): Promise<boolean> {
    try {
      const feature = await this.findFeatureToggleByName(name, true);

      // If this toggle is disabled, return false
      if (!feature.enabled) {
        return false;
      }

      // If this toggle has a parent, check if the parent is enabled
      if (feature.parentId) {
        // Recursively check parent's status
        const parent = await this.findFeatureToggleById(feature.parentId);
        return await this.isFeatureEnabled(parent.name);
      }

      // No parent or all parents enabled
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false; // If it doesn't exist, we assume it's disabled
      }
      throw error;
    }
  }

  /**
   * Updates a feature toggle
   */
  async updateFeatureToggle(id: string, updateDto: UpdateFeatureToggleDto): Promise<FeatureToggleEntity> {
    const featureToggle = await this.findFeatureToggleById(id);

    // Check if parent ID is being updated
    if (updateDto.parentId !== undefined) {
      // Check for circular references - a toggle cannot be its own ancestor
      if (updateDto.parentId && await this.wouldCreateCircularReference(id, updateDto.parentId)) {
        throw new Error('Cannot set parent: would create circular reference');
      }

      // Check if new parent exists
      if (updateDto.parentId) {
        const parent = await this.featureToggleRepository.findOne({
          where: {id: updateDto.parentId}
        });

        if (!parent) {
          throw new NotFoundException(`Parent feature toggle with ID "${ updateDto.parentId }" not found`);
        }
      }
    }
    
    this.featureToggleRepository.merge(featureToggle, updateDto);
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Enables or disables a feature toggle and its children
   */
  async toggleFeature(id: string, toggleDto: ToggleFeatureDto): Promise<FeatureToggleEntity> {
    const featureToggle = await this.findFeatureToggleById(id, true);

    // Update this toggle's status
    featureToggle.enabled = toggleDto.enabled;
    await this.featureToggleRepository.save(featureToggle);

    // If disabling, recursively disable all children
    if (!toggleDto.enabled && featureToggle.children && featureToggle.children.length > 0) {
      await this.disableChildrenRecursively(featureToggle.children);
    }

    // Fetch the updated entity with relations
    return this.findFeatureToggleById(id, true);
  }

  /**
   * Removes a feature toggle and all its children
   */
  async removeFeatureToggle(id: string): Promise<void> {
    const featureToggle = await this.findFeatureToggleById(id);
    // With cascade delete configured in the entity, all children will be deleted automatically
    await this.featureToggleRepository.remove(featureToggle);
  }

  /**
   * Recursively disable all children toggles
   */
  private async disableChildrenRecursively(children: FeatureToggleEntity[]): Promise<void> {
    for (const child of children) {
      child.enabled = false;
      await this.featureToggleRepository.save(child);

      // If this child has children, disable them too
      if (child.children && child.children.length > 0) {
        await this.disableChildrenRecursively(child.children);
      }
    }
  }

  /**
   * Check if setting a new parent would create a circular reference
   */
  private async wouldCreateCircularReference(toggleId: string, newParentId: string): Promise<boolean> {
    // If the new parent is the same as the toggle, it's a circular reference
    if (toggleId === newParentId) {
      return true;
    }

    // Get the new parent
    const parent = await this.featureToggleRepository.findOne({
      where: {id: newParentId},
      relations: [ 'parent' ]
    });

    if (!parent) {
      return false; // Parent doesn't exist, so no circular reference
    }

    // Check if any ancestor of the new parent is the toggle we're updating
    let currentParent = parent.parent;
    while (currentParent) {
      if (currentParent.id === toggleId) {
        return true; // Found circular reference
      }

      currentParent = await this.featureToggleRepository.findOne({
        where: {id: currentParent.id},
        relations: [ 'parent' ]
      });

      if (!currentParent) break;
      currentParent = currentParent.parent;
    }

    return false;
  }
}
