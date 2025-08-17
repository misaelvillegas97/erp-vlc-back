import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketEntity } from './domain/entities/ticket.entity';
import { AiService } from './ai.service';
import { AiListener } from './ai.listener';
import { WorkOrdersService } from './work-orders.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AiInvocationEntity } from './domain/entities/ai-invocation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketEntity, AiInvocationEntity]), NotificationsModule],
  controllers: [TicketsController],
  providers: [TicketsService, AiService, AiListener, WorkOrdersService],
  exports: [TicketsService]
})
export class TicketsModule {}
