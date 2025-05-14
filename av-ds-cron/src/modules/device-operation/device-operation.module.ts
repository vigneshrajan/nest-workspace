import { AvDsLibrary } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { DeviceOperationController } from './device-operation.controller';

@Module({
  imports: [AvDsLibrary],
  controllers: [DeviceOperationController],
  providers: [],
})
export class DeviceOperationModule {}
