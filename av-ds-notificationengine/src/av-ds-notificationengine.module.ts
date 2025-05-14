import { Module } from '@nestjs/common';
import { AvDsNotificationengineController } from './av-ds-notificationengine.controller';
import { AvDsNotificationengineService } from './av-ds-notificationengine.service';
import { AvDsLibrary } from '@library/av-ds-library';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [AvDsLibrary, NotificationsModule],
  controllers: [AvDsNotificationengineController],
  providers: [AvDsNotificationengineService],
})
export class AvDsNotificationengineModule {}
