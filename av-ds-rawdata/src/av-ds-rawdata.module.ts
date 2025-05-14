import { AvDsLibrary } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { AvDsRawdataController } from './av-ds-rawdata.controller';
import { AvDsRawdataService } from './av-ds-rawdata.service';
import { DataprocessModule } from './modules/dataprocess/dataprocess.module';

@Module({
  imports: [AvDsLibrary, DataprocessModule],
  controllers: [AvDsRawdataController],
  providers: [AvDsRawdataService],
})
export class AvDsRawdataModule {}
