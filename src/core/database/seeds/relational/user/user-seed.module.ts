import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserSeedService } from './user-seed.service';
import { UserEntity }      from '@modules/users/domain/entities/user.entity';
import { RoleUserEntity }  from '@modules/roles/domain/entities/role-user.entity';
import { RoleEntity }      from '@modules/roles/domain/entities/role.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ UserEntity, RoleEntity, RoleUserEntity ]) ],
  providers: [ UserSeedService ],
  exports: [ UserSeedService ],
})
export class UserSeedModule {}
