import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { CreateClientDto } from '@modules/clients/domain/dto/create-client.dto';
import { UpdateClientDto } from '@modules/clients/domain/dto/update-client.dto';

import { ClientService }     from './client.service';
import { ClientEntity }      from './domain/entities/client.entity';
import { QueryClientDto }    from '@modules/clients/domain/dto/query-client.dto';
import { ClientLightMapper } from '@modules/clients/domain/mappers/client-light.mapper';
import { ClientMapper }      from '@modules/clients/domain/mappers/client.mapper';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto): Promise<ClientEntity> {
    return this.clientService.create(createClientDto);
  }

  @Get()
  async findAll(@Query('layout') layout: 'FULL' | 'COMPACT' = 'FULL', @Query() queryDto: QueryClientDto): Promise<ClientLightMapper[]> {
    const clients = await this.clientService.findAll(queryDto);

    if (layout === 'COMPACT') return ClientLightMapper.mapAll(clients);
    return ClientMapper.mapAll(clients);
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
