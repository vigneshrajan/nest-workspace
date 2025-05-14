import { Controller, Get } from '@nestjs/common';
import { AvDsPostmanService } from './av-ds-postman.service';

@Controller()
export class AvDsPostmanController {
  constructor(private readonly avDsPostmanService: AvDsPostmanService) {}

  @Get()
  getHello(): string {
    return this.avDsPostmanService.getHello();
  }
}
