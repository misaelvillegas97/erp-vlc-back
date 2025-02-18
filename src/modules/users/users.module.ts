import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity }      from '@modules/roles/domain/entities/role.entity';
import { StatusEntity }    from '@modules/statuses/domain/entities/status.entity';
import { UserEntity }      from '@modules/users/domain/entities/user.entity';
import { UserRepository }  from '@modules/users/domain/repositories/user.repository';
import { FilesModule }     from '../files/files.module';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';
import { RoleUserEntity }  from '@modules/roles/domain/entities/role-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ UserEntity, RoleEntity, RoleUserEntity, StatusEntity ]),
    FilesModule
  ],
  controllers: [ UsersController ],
  providers: [ UsersService, UserRepository ],
  exports: [ UsersService, UserRepository, TypeOrmModule ],
})
export class UsersModule {}
