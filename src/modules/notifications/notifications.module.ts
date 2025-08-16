import { Module } from '@nestjs/common';
import { NotificationsGateway } from '@modules/notifications/notifications.gateway';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Module({
  imports: [],
  controllers: [],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
