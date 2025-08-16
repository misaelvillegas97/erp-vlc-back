import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TicketEntity } from './ticket.entity';

@Entity('ai_invocations')
export class AiInvocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: TicketEntity;

  @Column('uuid', { name: 'ticket_id' })
  ticketId: string;

  @Column({ length: 40 })
  operation: string;

  @Column({ length: 64 })
  model: string;

  @Column('int', { name: 'prompt_tokens', default: 0 })
  promptTokens: number;

  @Column('int', { name: 'completion_tokens', default: 0 })
  completionTokens: number;

  @Column('numeric', { name: 'cost_usd', precision: 10, scale: 6, default: 0 })
  costUsd: string;

  @Column('int', { name: 'latency_ms', nullable: true })
  latencyMs?: number;

  @Column('jsonb', { name: 'request_snapshot', nullable: true })
  requestSnapshot?: any;

  @Column('jsonb', { name: 'response_snapshot', nullable: true })
  responseSnapshot?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
