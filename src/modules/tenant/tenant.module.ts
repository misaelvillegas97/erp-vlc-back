import { Module }                 from '@nestjs/common';
import { TypeOrmModule }          from '@nestjs/typeorm';
import { TenantEntity }           from './domain/entities/tenant.entity';
import { TenantSettingsEntity }   from './domain/entities/tenant-settings.entity';
import { TenantRepository }       from './repositories/tenant.repository';
import { TenantService }          from './services/tenant.service';
import { TenantConfigService }    from './services/tenant-config.service';
import { TenantMiddleware }       from './middleware/tenant.middleware';
import { TenantSubscriber }       from './subscribers/tenant.subscriber';
import { TenantController }       from './controllers/tenant.controller';
import { TenantConfigController } from './controllers/tenant-config.controller';

/**
 * Module for managing tenant-related functionality.
 * Provides tenant context management, hierarchical configuration, and database operations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantSettingsEntity,
    ]),
  ],
  controllers: [
    TenantController,
    TenantConfigController,
  ],
  providers: [
    TenantRepository,
    TenantService,
    TenantConfigService,
    TenantMiddleware,
    TenantSubscriber,
  ],
  exports: [
    TenantRepository,
    TenantService,
    TenantConfigService,
    TenantMiddleware,
    TypeOrmModule,
  ],
})
export class TenantModule {}
