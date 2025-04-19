import { Injectable }          from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { FeatureToggleEntity } from '@modules/config/domain/entities/feature-toggle.entity';

@Injectable()
export class FeatureToggleSeedService {
  constructor(
    @InjectRepository(FeatureToggleEntity)
    private featureToggleRepository: Repository<FeatureToggleEntity>,
  ) {}

  /**
   * Seed initial feature toggles for application startup
   */
  async seed(): Promise<void> {
    const featureToggles = await this.featureToggleRepository.find();

    // Only seed if no feature toggles exist
    if (featureToggles.length === 0) {
      await this.seedFeatureToggles();
    }
  }

  /**
   * Create initial feature toggles with their hierarchical structure
   */
  private async seedFeatureToggles(): Promise<void> {
    // Create parent toggles first
    const parentToggles = [
      // GPS updates for vehicle tracking
      {
        name: 'gps-updates',
        displayName: 'GPS Vehicle Tracking',
        description: 'Enable/disable GPS location updates for vehicles',
        enabled: true,
        category: 'logistics',
        metadata: {
          updateFrequencySeconds: 300,
        },
      },
      // Accounting module
      {
        name: 'accounting-module',
        displayName: 'Accounting Module',
        description: 'Enable/disable the accounting module features',
        enabled: true,
        category: 'finance',
      },
      // Logistics module
      {
        name: 'logistics-module',
        displayName: 'Logistics Module',
        description: 'Enable/disable the logistics module features',
        enabled: true,
        category: 'operations',
      },
      // Notifications
      {
        name: 'notifications',
        displayName: 'Notifications',
        description: 'Enable/disable all notification systems',
        enabled: true,
        category: 'notifications',
      },
      // Reports generation
      {
        name: 'reports',
        displayName: 'Reports',
        description: 'Enable/disable all reporting features',
        enabled: true,
        category: 'reporting',
      },
      // Integrations
      {
        name: 'integrations',
        displayName: 'External Integrations',
        description: 'Enable/disable integration with external systems',
        enabled: true,
        category: 'integrations',
      },
      // API access
      {
        name: 'api-access',
        displayName: 'API Access',
        description: 'Enable/disable API access features',
        enabled: true,
        category: 'api',
      }
    ];

    // Save all parent toggles
    const savedParents = new Map();
    for (const toggle of parentToggles) {
      const saved = await this.featureToggleRepository.save(
        this.featureToggleRepository.create(toggle)
      );
      savedParents.set(toggle.name, saved);
    }

    // Child feature toggles with their parent relationships
    const childToggles = [
      // GPS Provider Children
      {
        name: 'biogps-provider',
        displayName: 'BioGPS Provider',
        description: 'Enable/disable BioGPS location provider',
        enabled: true,
        category: 'logistics',
        parentName: 'gps-updates',
        metadata: {
          apiKey: 'demo-key',
          endpoint: 'https://api.biogps.example.com/v1'
        },
      },
      {
        name: 'gpstracker-provider',
        displayName: 'GPS Tracker Provider',
        description: 'Enable/disable GPSTracker location provider',
        enabled: false, // Disabled by default
        category: 'logistics',
        parentName: 'gps-updates',
        metadata: {
          apiKey: 'test-key',
          endpoint: 'https://api.gpstracker.example.com/v2'
        },
      },

      // Accounting Module Children
      {
        name: 'invoicing',
        displayName: 'Invoicing',
        description: 'Enable/disable invoicing features',
        enabled: true,
        category: 'finance',
        parentName: 'accounting-module',
      },
      {
        name: 'reports-accounting',
        displayName: 'Accounting Reports',
        description: 'Enable/disable accounting reports',
        enabled: true,
        category: 'finance',
        parentName: 'accounting-module',
      },

      // Logistics Module Children
      {
        name: 'routing',
        displayName: 'Route Optimization',
        description: 'Enable/disable route optimization features',
        enabled: true,
        category: 'operations',
        parentName: 'logistics-module',
      },
      {
        name: 'warehouse-management',
        displayName: 'Warehouse Management',
        description: 'Enable/disable warehouse management features',
        enabled: true,
        category: 'operations',
        parentName: 'logistics-module',
      },

      // Notification Children
      {
        name: 'email-notifications',
        displayName: 'Email Notifications',
        description: 'Enable/disable email notifications system-wide',
        enabled: true,
        category: 'notifications',
        parentName: 'notifications',
      },
      {
        name: 'sms-notifications',
        displayName: 'SMS Notifications',
        description: 'Enable/disable SMS notifications system-wide',
        enabled: false, // Disabled by default
        category: 'notifications',
        parentName: 'notifications',
      },
      {
        name: 'push-notifications',
        displayName: 'Push Notifications',
        description: 'Enable/disable push notifications to mobile devices',
        enabled: true,
        category: 'notifications',
        parentName: 'notifications',
      },

      // Reports Children
      {
        name: 'automated-reports',
        displayName: 'Automated Reports',
        description: 'Enable/disable scheduled automated report generation',
        enabled: true,
        category: 'reporting',
        parentName: 'reports',
        metadata: {
          scheduledDays: [ 'MONDAY', 'WEDNESDAY', 'FRIDAY' ],
          formats: [ 'PDF', 'EXCEL', 'CSV' ]
        },
      },
      {
        name: 'realtime-reports',
        displayName: 'Real-time Reports',
        description: 'Enable/disable real-time report generation',
        enabled: false, // Resource intensive, disabled by default
        category: 'reporting',
        parentName: 'reports',
      },

      // Integration Children
      {
        name: 'supplier-integration',
        displayName: 'Supplier Integration',
        description: 'Enable/disable integration with supplier systems',
        enabled: false, // Disabled by default
        category: 'integrations',
        parentName: 'integrations',
      },
      {
        name: 'payment-gateways',
        displayName: 'Payment Gateway Integration',
        description: 'Enable/disable integration with payment gateways',
        enabled: true,
        category: 'integrations',
        parentName: 'integrations',
      },

      // API Children
      {
        name: 'customer-api',
        displayName: 'Customer API Access',
        description: 'Enable/disable API access for customers',
        enabled: true,
        category: 'api',
        parentName: 'api-access',
      },
      {
        name: 'partner-api',
        displayName: 'Partner API Access',
        description: 'Enable/disable API access for business partners',
        enabled: false, // Restricted by default
        category: 'api',
        parentName: 'api-access',
      },
    ];

    // Create children with their parent relationships
    for (const childToggle of childToggles) {
      const {parentName, ...toggle} = childToggle;
      const parent = savedParents.get(parentName);

      if (parent) {
        await this.featureToggleRepository.save(
          this.featureToggleRepository.create({
            ...toggle,
            parentId: parent.id
          })
        );
      }
    }

    // Third level - grand-children toggles (examples for GPS providers)
    const gpsProviderBio = await this.featureToggleRepository.findOne({
      where: {name: 'biogps-provider'}
    });

    if (gpsProviderBio) {
      await this.featureToggleRepository.save(
        this.featureToggleRepository.create({
          name: 'biogps-realtime',
          displayName: 'BioGPS Real-time Updates',
          description: 'Enable/disable real-time updates from BioGPS (high bandwidth usage)',
          enabled: false,
          category: 'logistics',
          parentId: gpsProviderBio.id,
          metadata: {
            updateIntervalSeconds: 30
          }
        })
      );

      await this.featureToggleRepository.save(
        this.featureToggleRepository.create({
          name: 'biogps-history',
          displayName: 'BioGPS History Tracking',
          description: 'Enable/disable historical route logging from BioGPS',
          enabled: true,
          category: 'logistics',
          parentId: gpsProviderBio.id,
          metadata: {
            retentionDays: 90
          }
        })
      );
    }
  }
}
