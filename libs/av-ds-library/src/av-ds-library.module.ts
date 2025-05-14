import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import {
  DbModule,
  LoggerModule,
  MessageQueueModule,
  RedisModule,
} from './modules';
import { RestApiModule } from './modules/rest-api';
import {
  ModbusProcessUtil,
  OpcuaProcessUtil,
  StartupService,
} from './services';

const MODULES = [
  DbModule,
  BusinessModule,
  LoggerModule,
  MessageQueueModule,
  RedisModule,
  RestApiModule,
];

const SERVICES = [OpcuaProcessUtil, ModbusProcessUtil];

@Module({
  imports: [...MODULES],
  providers: [StartupService, ...SERVICES],
  exports: [...MODULES, ...SERVICES],
})
export class AvDsLibrary {}
