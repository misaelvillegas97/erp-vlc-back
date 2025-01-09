import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../domain/entities/client.entity';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find();
  }

  async findOne(id: string): Promise<Client> {
    return this.clientRepository.findOne({ where: { id } });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    await this.clientRepository.update(id, updateClientDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.clientRepository.delete(id);
  }
}
