import { OnModuleInit }                 from '@nestjs/common';
import { FeatureToggleRegistryService } from '../feature-toggle-registry.service';
import { ModuleFeatureToggleProvider }  from '../interfaces/module-feature-toggle-provider.interface';

/**
 * Base class for modules that need to register feature toggles
 * Modules can extend this class to automatically register their feature toggles on initialization
 */
export abstract class FeatureToggleModule implements OnModuleInit {
  protected constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: ModuleFeatureToggleProvider,
    protected readonly parentToggleName?: string,
  ) {}

  /**
   * Registers the module's feature toggles on initialization
   */
  async onModuleInit() {
    await this.registerModuleFeatureToggles();
  }

  /**
   * Registers the module's feature toggles
   * This method can be overridden by subclasses if needed
   */
  protected async registerModuleFeatureToggles(): Promise<void> {
    const toggles = this.featureTogglesProvider.getModuleFeatureToggles();

    if (toggles.length === 0) {
      return;
    }

    // If a parent toggle name is specified, use it to find the parent toggle
    if (this.parentToggleName) {
      // First register toggles that match the parent toggle name
      const parentToggles = toggles.filter(t => t.name === this.parentToggleName);
      if (parentToggles.length > 0) {
        await this.featureToggleRegistry.ensureFeatureToggles(parentToggles);
      }

      // Find the parent toggle to get its ID
      const parentToggle = await this.featureToggleRegistry.findToggleByName(this.parentToggleName);

      if (parentToggle) {
        // Update child toggles with the parent ID
        const childToggles = toggles.filter(t => t.name !== this.parentToggleName);
        for (const childToggle of childToggles) {
          childToggle.parentId = parentToggle.id;
        }

        // Register child toggles
        await this.featureToggleRegistry.ensureFeatureToggles(childToggles);
      }
    } else {
      // If no parent toggle name is specified, register all toggles as is
      await this.featureToggleRegistry.ensureFeatureToggles(toggles);
    }
  }
}
