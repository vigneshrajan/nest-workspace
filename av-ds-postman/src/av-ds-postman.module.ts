import { Module } from '@nestjs/common';
import { AvDsPostmanController } from './av-ds-postman.controller';
import { AvDsPostmanService } from './av-ds-postman.service';
import { AvDsLibrary } from '@library/av-ds-library';
import { AvDsBackLogService } from './av-ds-backlog.service';

@Module({
  imports: [AvDsLibrary],
  controllers: [AvDsPostmanController],
  providers: [AvDsPostmanService, AvDsBackLogService],
})
export class AvDsPostmanModule {}
