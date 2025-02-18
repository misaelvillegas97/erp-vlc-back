import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt         from 'bcryptjs';

import { UserEntity }     from '@modules/users/domain/entities/user.entity';
import { RoleEnum }       from '@modules/roles/roles.enum';
import { StatusEnum }     from '@modules/statuses/domain/enum/statuses.enum';
import { ConfigService }  from '@nestjs/config';
import { AllConfigType }  from '@core/config/config.type';
import { RoleUserEntity } from '@modules/roles/domain/entities/role-user.entity';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity) private repository: Repository<UserEntity>,
    @InjectRepository(RoleUserEntity) private roleUserRepository: Repository<RoleUserEntity>,
    private readonly configService: ConfigService<AllConfigType>
  ) {}

  async run() {
    const countAdmin = await this.repository.count({
      where: {email: 'lord@supremo.com'},
    });

    if (!countAdmin) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      const user = await this.repository.save(
        this.repository.create({
          firstName: 'Super',
          lastName: 'Admin',
          email: 'lord@supremo.com',
          password,
          role: {
            id: RoleEnum.admin,
            name: 'Admin',
          },
          roles: [],
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );

      await this.roleUserRepository.save(
        this.roleUserRepository.create({
          userId: user.id,
          roleId: RoleEnum.admin,
        })
      );
    }

    const countUser = await this.repository.count({where: {email: 'john.doe@example.com'}});

    if (!countUser) {
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('secret', salt);

      await this.repository.save(
        this.repository.create({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password,
          role: {
            id: RoleEnum.user,
            name: 'Admin',
          },
          status: {
            id: StatusEnum.active,
            name: 'Active',
          },
        }),
      );
    }
  }
}
