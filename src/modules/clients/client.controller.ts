import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

import { CreateClientDto } from '@modules/clients/domain/dto/create-client.dto';
import { UpdateClientDto } from '@modules/clients/domain/dto/update-client.dto';

import { ClientService }     from './client.service';
import { ClientEntity }      from './domain/entities/client.entity';
import { QueryClientDto }    from '@modules/clients/domain/dto/query-client.dto';
import { ClientLightMapper } from '@modules/clients/domain/mappers/client-light.mapper';
import { ClientMapper }      from '@modules/clients/domain/mappers/client.mapper';

@ApiTags('Clients')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiBody({ type: CreateClientDto })
  @ApiResponse({ status: 201, description: 'Client created successfully.', type: ClientEntity })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error).' })
  create(@Body() createClientDto: CreateClientDto): Promise<ClientEntity> {
    return this.clientService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all clients (paginated)' })
  @ApiQuery({ name: 'layout', required: false, enum: ['FULL', 'COMPACT'], description: 'Response layout type. FULL returns all client fields, COMPACT returns a lighter version.', example: 'FULL' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination (from QueryClientDto)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (from QueryClientDto)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for clients (from QueryClientDto)' })
  @ApiResponse({ status: 200, description: 'List of clients retrieved successfully. Structure depends on layout parameter.', type: [ClientMapper] }) // ClientMapper for FULL, ClientLightMapper for COMPACT
  async findAll(@Query('layout') layout: 'FULL' | 'COMPACT' = 'FULL', @Query() queryDto: QueryClientDto): Promise<ClientLightMapper[] | ClientMapper[]> {
    const clients = await this.clientService.findAll(queryDto);

    if (layout === 'COMPACT') return ClientLightMapper.mapAll(clients);
    return ClientMapper.mapAll(clients);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a single client by ID' })
  @ApiParam({ name: 'id', description: 'ID of the client to retrieve', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiResponse({ status: 200, description: 'Client retrieved successfully.', type: ClientEntity })
  @ApiResponse({ status: 404, description: 'Client not found.' })
  findOne(@Param('id') id: string): Promise<ClientEntity> {
    return this.clientService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing client' })
  @ApiParam({ name: 'id', description: 'ID of the client to update', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiBody({ type: UpdateClientDto })
  @ApiResponse({ status: 200, description: 'Client updated successfully.', type: ClientEntity })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error).' })
  @ApiResponse({ status: 404, description: 'Client not found.' })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto): Promise<ClientEntity> {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a client' })
  @ApiParam({ name: 'id', description: 'ID of the client to remove', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiResponse({ status: 204, description: 'Client removed successfully.' })
  @ApiResponse({ status: 404, description: 'Client not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.clientService.remove(id);
  }
}
