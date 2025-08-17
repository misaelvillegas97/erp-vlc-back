import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class WorkOrdersService {
  openFromTicket({ ticketId, title }: { ticketId: string; title: string }) {
    return { id: uuid(), ticketId, title };
  }
}
