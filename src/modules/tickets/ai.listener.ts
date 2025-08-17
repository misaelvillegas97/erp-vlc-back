import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { AiService } from './ai.service';
import { WorkOrdersService } from './work-orders.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { AiInvocationEntity } from './domain/entities/ai-invocation.entity';

function emailHtml(ticketId: string): string {
  return `Ticket ${ticketId} actualizado`;
}

function whatsappText(ticketId: string, woId: string): string {
  return `Ticket ${ticketId} - OT ${woId}`;
}

@Injectable()
export class AiListener {
  constructor(
    private readonly tickets: TicketsService,
    private readonly ai: AiService,
    private readonly workOrders: WorkOrdersService,
    private readonly notifications: NotificationsService,
    @InjectRepository(AiInvocationEntity)
    private readonly aiRepo: Repository<AiInvocationEntity>,
  ) {}

  @OnEvent('tickets.created')
  async handle({ ticketId }: { ticketId: string }) {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) return;

    const { out, meta } = await this.ai.summarize({
      subject: ticket.subject,
      description: ticket.description,
    });

    await this.tickets.update(ticket.id, {
      summary: out.summary,
      type: out.type,
      priority: out.priority ?? null,
      reason: out.reason ?? null,
      suggestedReply: out.reply ?? null,
      status: ticket.status,
    });

    await this.aiRepo.save(this.aiRepo.create({
      ticketId: ticket.id,
      operation: 'summarize',
      model: meta.model,
      promptTokens: meta.prompt_tokens,
      completionTokens: meta.completion_tokens,
      costUsd: meta.cost_usd,
      latencyMs: meta.latency_ms,
      requestSnapshot: meta.request_snapshot,
      responseSnapshot: meta.response_snapshot,
    }));

    const wo = await this.workOrders.openFromTicket({ ticketId: ticket.id, title: ticket.subject });
    await this.notifications.queueEmail({ to: process.env.SUPPORT_EMAIL, subject: `Ticket+OT: ${ticket.subject}`, html: emailHtml(ticket.id) });
    await this.notifications.queueWhatsApp({ to: process.env.SUPPORT_WSP_MSISDN, text: whatsappText(ticket.id, wo.id) });
  }
}
