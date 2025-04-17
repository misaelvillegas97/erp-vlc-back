import { SetMetadata } from '@nestjs/common';

export const FEATURE_TOGGLE_KEY = 'featureToggle';

/**
 * Decorator to indicate that a route or controller requires a specific feature toggle
 * @param featureName Name of the feature toggle that must be enabled
 */
export const RequireFeature = (featureName: string) =>
  SetMetadata(FEATURE_TOGGLE_KEY, featureName);
