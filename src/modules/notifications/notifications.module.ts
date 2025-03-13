import { Module }               from '@nestjs/common';
import { NotificationsGateway } from '@modules/notifications/notifications.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [ NotificationsGateway ],
  exports: []
})
export class NotificationsModule {}
