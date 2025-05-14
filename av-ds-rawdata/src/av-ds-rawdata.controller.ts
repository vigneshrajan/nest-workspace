import { Controller, Get } from '@nestjs/common';
import { AvDsRawdataService } from './av-ds-rawdata.service';

@Controller()
export class AvDsRawdataController {
  constructor(private readonly avDsRawdataService: AvDsRawdataService) {}

  @Get()
  getAppName(): string {
    return this.avDsRawdataService.getAppName();
  }
}
