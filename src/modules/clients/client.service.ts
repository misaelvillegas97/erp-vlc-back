import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { CreateClientDto } from '@modules/clients/domain/dto/create-client.dto';
import { UpdateClientDto } from '@modules/clients/domain/dto/update-client.dto';
import { ClientEntity }    from './domain/entities/client.entity';
import { QueryClientDto }  from '@modules/clients/domain/dto/query-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<ClientEntity> {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  async findAll(query: QueryClientDto): Promise<ClientEntity[]> {
    const qb = this.clientRepository.createQueryBuilder('client');

    if (query.fantasyName)
      qb.andWhere('client.fantasyName ilike :fantasyName', {fantasyName: `%${ query.fantasyName }%`});

    return qb.getMany();
  }

  async findOne(id: string): Promise<ClientEntity> {
    return this.clientRepository.findOne({where: {id}});
  }

  async findByCode(code: string): Promise<ClientEntity> {
    return this.clientRepository.findOne({where: {code}});
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<ClientEntity> {
    await this.clientRepository.update(id, updateClientDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.clientRepository.softDelete(id);
  }
}
