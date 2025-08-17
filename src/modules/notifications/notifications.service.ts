import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AllConfigType } from '@core/config/config.type';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  queueEmail(params: { to: string; subject: string; html: string }) {
    this.logger.log(`Email queued to ${params.to}`);
  }

  async queueWhatsApp(params: { to: string; text: string }) {
    const apiUrl = this.configService.get('whatsapp.apiUrl', { infer: true });
    const phoneId = this.configService.get('whatsapp.phoneId', { infer: true });
    const token = this.configService.get('whatsapp.token', { infer: true });
    const url = `${apiUrl}/${phoneId}/messages`;

    try {
      await firstValueFrom(
        this.http.post(
          url,
          {
            messaging_product: 'whatsapp',
            to: params.to,
            type: 'text',
            text: { body: params.text },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`WhatsApp sent to ${params.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp to ${params.to}`,
        error?.response?.data || error.message,
      );
    }
  }
}
