import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { CreateClientDto } from '@modules/clients/domain/dto/create-client.dto';
import { UpdateClientDto } from '@modules/clients/domain/dto/update-client.dto';

import { ClientService } from './client.service';
import { ClientEntity }  from './domain/entities/client.entity';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto): Promise<ClientEntity> {
    return this.clientService.create(createClientDto);
  }

  @Get()
  findAll(): Promise<ClientEntity[]> {
    return this.clientService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ClientEntity> {
    return this.clientService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto): Promise<ClientEntity> {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.clientService.remove(id);
  }
}
