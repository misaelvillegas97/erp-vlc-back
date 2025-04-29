import { Module }               from '@nestjs/common';
import { TypeOrmModule }        from '@nestjs/typeorm';
import { NavigationController } from './navigation.controller';
import { NavigationService }    from './navigation.service';
import { NavigationItemEntity } from './domain/entities/navigation-item.entity';
import { RoleEntity }           from '@modules/roles/domain/entities/role.entity';
import { FeatureToggleEntity }  from '@modules/config/domain/entities/feature-toggle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NavigationItemEntity,
      RoleEntity,
      FeatureToggleEntity
    ])
  ],
  controllers: [ NavigationController ],
  providers: [ NavigationService ],
  exports: [ NavigationService, TypeOrmModule ]
})
export class NavigationModule {}
