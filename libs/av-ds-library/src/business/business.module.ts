import { Module } from '@nestjs/common';
import { LoggerModule } from '../modules/logger/logger.module';
import { RedisModule } from '../modules/redis/redis.module';
import { DataScrapperVersionBusiness } from './datascarapperversion.business';
import { DeviceBusiness } from './device.business';
import { PlantBusiness } from './plant.business';
import { ProtocolDataBusiness } from './protocoldata.business';
import { TokenBusiness } from './token.business';
import { DeviceRawDataBusiness } from './devicerawdata.business';
import { DeviceDataSamplerBusiness } from './devicedatasample.business';
import { DbModule } from '../modules';
import { PPCDeviceBusiness } from './ppcdevicedata.business';
import { AlertBusiness } from './alert.business';
import { EventBusiness } from './event.business';
import { BlockBusiness } from './block.business';

const SERVICES = [
  PlantBusiness,
  DeviceBusiness,
  DataScrapperVersionBusiness,
  TokenBusiness,
  ProtocolDataBusiness,
  DeviceRawDataBusiness,
  DeviceDataSamplerBusiness,
  PPCDeviceBusiness,
  AlertBusiness,
  EventBusiness,
  BlockBusiness,
];
@Module({
  imports: [LoggerModule, RedisModule, DbModule],
  providers: [...SERVICES],
  exports: [...SERVICES],
})
export class BusinessModule {}
