import { Controller, Get } from '@nestjs/common';
import { AvDsNotificationengineService } from './av-ds-notificationengine.service';

@Controller()
export class AvDsNotificationengineController {
  constructor(
    private readonly avDsNotificationengineService: AvDsNotificationengineService,
  ) {}

  @Get()
  getTitle(): string {
    return this.avDsNotificationengineService.getTitle();
  }
}
