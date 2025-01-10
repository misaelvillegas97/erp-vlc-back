import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { RoleEntity }       from '@modules/roles/domain/entities/role.entity';
import { RoleEnum }         from '@modules/roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private repository: Repository<RoleEntity>,
  ) {}

  async run() {
    const countUser = await this.repository.count({
      where: {
        id: RoleEnum.user,
      },
    });

    if (!countUser) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.user,
          name: 'User',
        }),
      );
    }

    const countAdmin = await this.repository.count({
      where: {
        id: RoleEnum.admin,
      },
    });

    if (!countAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.admin,
          name: 'Admin',
        }),
      );
    }

    const countDispatcher = await this.repository.count({
      where: {
        id: RoleEnum.dispatcher,
      },
    });

    if (!countDispatcher) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.dispatcher,
          name: 'Dispatcher',
        }),
      );
    }

    const countDriver = await this.repository.count({
      where: {
        id: RoleEnum.driver,
      },
    });

    if (!countDriver) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.driver,
          name: 'Driver',
        }),
      );
    }

    const countAccountant = await this.repository.count({
      where: {
        id: RoleEnum.accountant,
      },
    });

    if (!countAccountant) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.accountant,
          name: 'Accountant',
        }),
      );
    }
  }
}
