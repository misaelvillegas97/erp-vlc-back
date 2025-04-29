import { Module }                from '@nestjs/common';
import { TypeOrmModule }         from '@nestjs/typeorm';
import { NavigationSeedService } from './navigation-seed.service';
import { NavigationItemEntity }  from '@modules/navigation/domain/entities/navigation-item.entity';
import { FeatureToggleEntity }   from '@modules/config/domain/entities/feature-toggle.entity';
import { RoleEntity }            from '@modules/roles/domain/entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NavigationItemEntity,
      FeatureToggleEntity,
      RoleEntity
    ])
  ],
  providers: [ NavigationSeedService ],
  exports: [ NavigationSeedService ]
})
export class NavigationSeedModule {}
