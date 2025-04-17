import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { ConfigController }    from './config.controller';
import { ConfigService }       from './config.service';
import { FeatureToggleEntity } from './domain/entities/feature-toggle.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ FeatureToggleEntity ]) ],
  controllers: [ ConfigController ],
  providers: [ ConfigService ],
  exports: [ ConfigService, TypeOrmModule ],
})
export class ConfigModule {}
