import { CreateFeatureToggleDto } from '../dto/create-feature-toggle.dto';

export interface ModuleFeatureToggleProvider {
  /**
   * Returns the feature toggles that this module requires
   */
  getModuleFeatureToggles(): CreateFeatureToggleDto[];
}
