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
    const featureToggle = this.featureToggleRepository.create(createDto);
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Gets all feature toggles with filtering options
   */
  async findAllFeatureToggles(filters: {
    enabled?: boolean;
    category?: string;
  } = {}): Promise<FeatureToggleEntity[]> {
    const query = this.featureToggleRepository.createQueryBuilder('feature');

    if (filters.enabled !== undefined) {
      query.andWhere('feature.enabled = :enabled', {enabled: filters.enabled});
    }

    if (filters.category) {
      query.andWhere('feature.category = :category', {category: filters.category});
    }

    return query.getMany();
  }

  /**
   * Gets a feature toggle by ID
   */
  async findFeatureToggleById(id: string): Promise<FeatureToggleEntity> {
    const featureToggle = await this.featureToggleRepository.findOne({
      where: {id},
    });

    if (!featureToggle) {
      throw new NotFoundException(`Feature toggle with ID "${ id }" not found`);
    }

    return featureToggle;
  }

  /**
   * Finds a feature toggle by name
   */
  async findFeatureToggleByName(name: string): Promise<FeatureToggleEntity> {
    const featureToggle = await this.featureToggleRepository.findOne({
      where: {name},
    });

    if (!featureToggle) {
      throw new NotFoundException(`Feature toggle with name "${ name }" not found`);
    }

    return featureToggle;
  }

  /**
   * Checks if a feature toggle is enabled
   */
  async isFeatureEnabled(name: string): Promise<boolean> {
    try {
      const feature = await this.findFeatureToggleByName(name);
      return feature.enabled;
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

    this.featureToggleRepository.merge(featureToggle, updateDto);
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Enables or disables a feature toggle
   */
  async toggleFeature(id: string, toggleDto: ToggleFeatureDto): Promise<FeatureToggleEntity> {
    const featureToggle = await this.findFeatureToggleById(id);

    featureToggle.enabled = toggleDto.enabled;
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Removes a feature toggle
   */
  async removeFeatureToggle(id: string): Promise<void> {
    const featureToggle = await this.findFeatureToggleById(id);
    await this.featureToggleRepository.remove(featureToggle);
  }
}
