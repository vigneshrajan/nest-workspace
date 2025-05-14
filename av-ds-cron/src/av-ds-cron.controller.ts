import { Controller, Get } from '@nestjs/common';
import { AvDsCronService } from './av-ds-cron.service';

@Controller()
export class AvDsCronController {
  constructor(private readonly avDsCronService: AvDsCronService) {}

  @Get()
  getTitle(): string {
    return this.avDsCronService.getTitle();
  }
}
