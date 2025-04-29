# Feature Toggle System

This module provides a feature toggle system that allows modules to define and register their own feature toggles. Feature toggles can be used to enable or disable features in the application.

## How to Use Feature Toggles in Your Module

### 1. Create a Feature Toggle Provider

Create a provider that implements the `ModuleFeatureToggleProvider` interface. This provider will define the feature toggles for your module.

```typescript
import { Injectable } from '@nestjs/common';
import { CreateFeatureToggleDto } from '@modules/config/dto/create-feature-toggle.dto';
import { ModuleFeatureToggleProvider } from '@modules/config/interfaces/module-feature-toggle-provider.interface';

@Injectable()
export class YourModuleFeatureTogglesProvider implements ModuleFeatureToggleProvider {
  getModuleFeatureToggles(): CreateFeatureToggleDto[] {
    return [
      // Parent toggle for your module
      {
        name: 'your-module',
        displayName: 'Your Module',
        description: 'Enable/disable your module features',
        enabled: true,
        category: 'your-category',
      },
      // Child toggles for specific features
      {
        name: 'feature-1',
        displayName: 'Feature 1',
        description: 'Enable/disable Feature 1',
        enabled: true,
        category: 'your-category',
        parentId: null, // Will be updated dynamically
      },
      {
        name: 'feature-2',
        displayName: 'Feature 2',
        description: 'Enable/disable Feature 2',
        enabled: true,
        category: 'your-category',
        parentId: null, // Will be updated dynamically
      }
    ];
  }
}
```

### 2. Update Your Module

Extend the `FeatureToggleModule` base class and use your feature toggle provider:

```typescript
import { Module } from '@nestjs/common';
import { YourModuleFeatureTogglesProvider } from './your-module-feature-toggles.provider';
import { FeatureToggleRegistryService } from '@modules/config/feature-toggle-registry.service';
import { FeatureToggleModule } from '@modules/config/base/feature-toggle-module.base';

@Module({
  imports: [ /* your imports */ ],
  controllers: [ /* your controllers */ ],
  providers: [
    /* your other providers */
    YourModuleFeatureTogglesProvider
  ],
  exports: [ /* your exports */ ]
})
export class YourModule extends FeatureToggleModule {
  constructor(
    protected readonly featureToggleRegistry: FeatureToggleRegistryService,
    protected readonly featureTogglesProvider: YourModuleFeatureTogglesProvider,
  ) {
    super(featureToggleRegistry, featureTogglesProvider, 'your-module');
  }
}
```

### 3. Check Feature Toggle Status in Your Services

You can use the `AppConfigService` to check if a feature toggle is enabled:

```typescript
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@modules/config/app-config.service';

@Injectable()
export class YourService {
  constructor(private readonly appConfigService: AppConfigService) {
  }

  async someMethod() {
    // Check if a feature is enabled
    const isFeatureEnabled = await this.appConfigService.isFeatureEnabled('feature-1');

    if (isFeatureEnabled) {
      // Feature is enabled, do something
    } else {
      // Feature is disabled, do something else
    }
  }
}
```

## Feature Toggle Hierarchy

Feature toggles can have a parent-child relationship. If a parent toggle is disabled, all its children are automatically considered disabled, regardless of their individual status.

For example, if the 'your-module' toggle is disabled, then 'feature-1' and 'feature-2' will also be considered disabled, even if they are individually enabled.

## Feature Toggle Metadata

Feature toggles can have metadata associated with them. This metadata can be used to store configuration values for the feature.

```typescript
{
  name: 'feature-with-metadata',
    displayName
:
  'Feature With Metadata',
    description
:
  'A feature with metadata',
    enabled
:
  true,
    category
:
  'your-category',
    metadata
:
  {
    maxItems: 10,
      timeout
  :
    5000,
      retryCount
  :
    3
  }
}
```

You can access this metadata through the `AppConfigService`:

```typescript
const feature = await this.appConfigService.findFeatureToggleByName('feature-with-metadata');
const maxItems = feature.metadata?.maxItems || 10; // Default to 10 if not set
```

## Required Metadata

You can also define required metadata for a feature toggle. This is useful for features that require specific configuration values.

```typescript
{
  name: 'feature-with-required-metadata',
    displayName
:
  'Feature With Required Metadata',
    description
:
  'A feature with required metadata',
    enabled
:
  true,
    category
:
  'your-category',
    requiredMetadata
:
  [
    {
      name: 'apiKey',
      description: 'API key for the service',
      type: 'string'
    },
    {
      name: 'timeout',
      description: 'Timeout in milliseconds',
      type: 'number',
      defaultValue: 5000
    }
  ]
}
```
