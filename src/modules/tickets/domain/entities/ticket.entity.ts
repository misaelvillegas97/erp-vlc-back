import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '@shared/domain/entities/abstract.entity';

@Entity('tickets')
export class TicketEntity extends AbstractEntity {
  @Column({ length: 20 })
  source: 'erp' | 'fleet';

  @Column('text')
  subject: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  summary?: string;

  @Column({ length: 20, nullable: true })
  type?: 'bug' | 'consulta' | 'feature' | 'incidencia';

  @Column({ length: 20, default: 'open' })
  status: 'open' | 'in_progress' | 'done' | 'canceled';

  @Column({ length: 10, nullable: true })
  priority?: 'alta' | 'media' | 'baja';

  @Column('text', { name: 'suggested_reply', nullable: true })
  suggestedReply?: string;

  @Column('text', { nullable: true })
  reason?: string;

  @Column('jsonb', { nullable: true })
  context?: Record<string, any>;
}
