import { AvDsLibrary, BusinessModule } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { ProtocolDataController } from './protocoldata.controller';

@Module({
  imports: [BusinessModule, AvDsLibrary],
  controllers: [ProtocolDataController],
})
export class ProtocolDataModule {}
