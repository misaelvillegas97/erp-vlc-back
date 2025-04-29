import { Injectable, Logger }     from '@nestjs/common';
import { InjectRepository }       from '@nestjs/typeorm';
import { Repository }             from 'typeorm';
import { FeatureToggleEntity }    from './domain/entities/feature-toggle.entity';
import { CreateFeatureToggleDto } from './dto/create-feature-toggle.dto';

@Injectable()
export class FeatureToggleRegistryService {
  private readonly logger = new Logger(FeatureToggleRegistryService.name);

  constructor(
    @InjectRepository(FeatureToggleEntity)
    private featureToggleRepository: Repository<FeatureToggleEntity>,
  ) {}

  /**
   * Ensures that a feature toggle exists in the database
   * If it doesn't exist, it will be created
   */
  async ensureFeatureToggle(toggle: CreateFeatureToggleDto): Promise<FeatureToggleEntity> {
    // Check if the feature toggle already exists
    const existingToggle = await this.featureToggleRepository.findOne({
      where: {name: toggle.name},
    });

    if (existingToggle) {
      this.logger.log(`Feature toggle '${ toggle.name }' already exists`);
      return existingToggle;
    }

    // If parent is provided, ensure it exists
    if (toggle.parentId) {
      const parent = await this.featureToggleRepository.findOne({
        where: {id: toggle.parentId},
      });

      if (!parent) {
        this.logger.warn(`Parent feature toggle with ID "${ toggle.parentId }" not found. Creating toggle without parent.`);
        toggle.parentId = undefined;
      }
    }

    // Create the feature toggle
    this.logger.log(`Creating feature toggle '${ toggle.name }'`);
    const featureToggle = this.featureToggleRepository.create(toggle);
    return this.featureToggleRepository.save(featureToggle);
  }

  /**
   * Ensures that a list of feature toggles exist in the database
   */
  async ensureFeatureToggles(toggles: CreateFeatureToggleDto[]): Promise<FeatureToggleEntity[]> {
    const results: FeatureToggleEntity[] = [];

    // Process parent toggles first
    const parentToggles = toggles.filter(toggle => !toggle.parentId);
    for (const toggle of parentToggles) {
      const result = await this.ensureFeatureToggle(toggle);
      results.push(result);
    }

    // Then process child toggles
    const childToggles = toggles.filter(toggle => !!toggle.parentId);
    for (const toggle of childToggles) {
      const result = await this.ensureFeatureToggle(toggle);
      results.push(result);
    }

    return results;
  }

  /**
   * Finds a feature toggle by name
   */
  async findToggleByName(name: string): Promise<FeatureToggleEntity> {
    const toggle = await this.featureToggleRepository.findOne({
      where: {name},
    });

    if (!toggle) {
      this.logger.warn(`Feature toggle '${ name }' not found`);
      return null;
    }

    return toggle;
  }
}
