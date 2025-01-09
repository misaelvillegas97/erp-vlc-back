import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ClientEntity } from '@modules/clients/domain/entities/client.entity';

@Injectable()
export class ClientSeedService {
  private readonly logger = new Logger(ClientSeedService.name);

  constructor(@InjectRepository(ClientEntity) private readonly repository: Repository<ClientEntity>) {}

  async run() {
    this.logger.log('Seeding clients...');
    const countClient = await this.repository.count({
      where: [ {code: 'CencosudB2B'} ]
    });

    if (!countClient) {
      await this.repository.save(
        this.repository.create({
          fantasyName: 'Cencosud S.A.',
          code: 'CencosudB2B',
          businessName: 'Cencosud S.A.',
          email: 'changeme@cencosud.cl',
          nationalId: '123456789',
          phoneNumber: '+56912345678'
        })
      );
      await this.repository.save(
        this.repository.create({
          fantasyName: 'Wallmart S.A.',
          code: 'WallmartB2B',
          businessName: 'Wallmart S.A.',
          email: 'changeme@wallmart.cl',
          nationalId: '123456780',
          phoneNumber: '+56912345679'
        })
      );
    }
  }
}
