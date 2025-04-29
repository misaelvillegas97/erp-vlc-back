import { Global, Module }               from '@nestjs/common';
import { TypeOrmModule }                from '@nestjs/typeorm';
import { ConfigController }             from './config.controller';
import { AppConfigService }             from './app-config.service';
import { FeatureToggleEntity }          from './domain/entities/feature-toggle.entity';
import { FeatureToggleRegistryService } from './feature-toggle-registry.service';

@Module({
  imports: [ TypeOrmModule.forFeature([ FeatureToggleEntity ]) ],
  controllers: [ ConfigController ],
  providers: [ AppConfigService, FeatureToggleRegistryService ],
  exports: [ AppConfigService, FeatureToggleRegistryService, TypeOrmModule ],
})
@Global()
export class ConfigModule {}
