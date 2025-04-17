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
   * Create initial feature toggles
   */
  private async seedFeatureToggles(): Promise<void> {
    const initialFeatures = [
      // GPS updates for vehicle tracking
      {
        name: 'gps-updates',
        displayName: 'GPS Vehicle Tracking',
        description: 'Enable/disable GPS location updates for vehicles',
        enabled: true,
        category: 'logistics',
        metadata: {
          updateFrequencySeconds: 300,
          accuracyThresholdMeters: 10
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
      // Email notifications
      {
        name: 'email-notifications',
        displayName: 'Email Notifications',
        description: 'Enable/disable email notifications system-wide',
        enabled: true,
        category: 'notifications',
      },
      // SMS notifications
      {
        name: 'sms-notifications',
        displayName: 'SMS Notifications',
        description: 'Enable/disable SMS notifications system-wide',
        enabled: false,
        category: 'notifications',
      },
      // Reports generation
      {
        name: 'automated-reports',
        displayName: 'Automated Reports',
        description: 'Enable/disable scheduled automated report generation',
        enabled: true,
        category: 'reporting',
        metadata: {
          scheduledDays: [ 'MONDAY', 'WEDNESDAY', 'FRIDAY' ],
          formats: [ 'PDF', 'EXCEL', 'CSV' ]
        },
      },
      // Supplier integration
      {
        name: 'supplier-integration',
        displayName: 'Supplier Integration',
        description: 'Enable/disable integration with supplier systems',
        enabled: false,
        category: 'integrations',
      },
      // Customer API access
      {
        name: 'customer-api',
        displayName: 'Customer API Access',
        description: 'Enable/disable API access for customers',
        enabled: true,
        category: 'api',
      }
    ];

    // Create the feature toggles in batches
    for (const featureToggle of initialFeatures) {
      await this.featureToggleRepository.save(
        this.featureToggleRepository.create(featureToggle)
      );
    }
  }
}
