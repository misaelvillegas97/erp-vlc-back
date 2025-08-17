import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { TicketEntity } from './domain/entities/ticket.entity';
import { CreateTicketDto } from './domain/dto/create-ticket.dto';
import { UpdateTicketDto } from './domain/dto/update-ticket.dto';
import { TicketStatsDto, TopTicketCreatorDto } from './domain/dto/ticket-stats.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly repo: Repository<TicketEntity>,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateTicketDto): Promise<TicketEntity> {
    const ticket = this.repo.create({
      source: dto.source,
      subject: dto.subject,
      description: dto.description,
      context: dto.context,
      createdById: dto.createdBy,
    });
    const saved = await this.repo.save(ticket);
    this.events.emit('tickets.created', { ticketId: saved.id });
    return saved;
  }

  async findById(id: string): Promise<TicketEntity> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateTicketDto): Promise<TicketEntity> {
    await this.repo.update(id, dto as any);
    return this.findById(id);
  }

  async stats(): Promise<TicketStatsDto> {
    const total = await this.repo.count();

    const byTypeRows = await this.repo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    for (const row of byTypeRows) {
      if (row.type) {
        byType[row.type] = Number(row.count);
      }
    }

    const topCreatorsRows = await this.repo
      .createQueryBuilder('t')
      .select('t.createdById', 'userId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.createdById')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    const topCreators: TopTicketCreatorDto[] = topCreatorsRows.map((row) => ({
      userId: row.userId,
      count: Number(row.count),
    }));

    return { total, byType, topCreators };
  }
}
