import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './domain/dto/create-ticket.dto';
import { UpdateTicketDto } from './domain/dto/update-ticket.dto';
import { TicketEntity } from './domain/entities/ticket.entity';
import { TicketStatsDto } from './domain/dto/ticket-stats.dto';

@ApiTags('Tickets')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create ticket' })
  @ApiCreatedResponse({ type: TicketEntity })
  create(@Body() dto: CreateTicketDto): Promise<TicketEntity> {
    return this.tickets.create(dto);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiOkResponse({ type: TicketStatsDto })
  stats(): Promise<TicketStatsDto> {
    return this.tickets.stats();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiOkResponse({ type: TicketEntity })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string): Promise<TicketEntity> {
    return this.tickets.findById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update ticket' })
  @ApiOkResponse({ type: TicketEntity })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto): Promise<TicketEntity> {
    return this.tickets.update(id, dto);
  }
}
