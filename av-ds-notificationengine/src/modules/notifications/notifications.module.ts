import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AvDsLibrary } from '@library/av-ds-library';
import { NotificationProcessBusiness } from '../../business/notification.process.business';

@Module({
  imports: [AvDsLibrary],
  providers: [NotificationsService, NotificationProcessBusiness],
})
export class NotificationsModule {}
