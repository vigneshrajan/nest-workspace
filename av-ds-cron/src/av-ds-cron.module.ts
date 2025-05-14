import { AvDsLibrary } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AvDsCronController } from './av-ds-cron.controller';
import { AvDsCronService } from './av-ds-cron.service';
import {
  CommunicationModule,
  ConfigModule,
  DeviceOperationModule,
  ProtocolDataModule,
  TriggerModule,
} from './modules';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AvDsLibrary,
    ConfigModule,
    TriggerModule,
    DeviceOperationModule,
    ProtocolDataModule,
    CommunicationModule,
  ],
  controllers: [AvDsCronController],
  providers: [AvDsCronService],
})
export class AvDsCronModule {}
