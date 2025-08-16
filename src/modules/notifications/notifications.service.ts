import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  queueEmail(params: { to: string; subject: string; html: string }) {
    this.logger.log(`Email queued to ${params.to}`);
  }

  queueWhatsApp(params: { to: string; text: string }) {
    this.logger.log(`WhatsApp queued to ${params.to}`);
  }
}
