import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsGateway } from '@modules/notifications/notifications.gateway';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
