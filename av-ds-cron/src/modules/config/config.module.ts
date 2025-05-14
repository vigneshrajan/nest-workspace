import { AvDsLibrary, BusinessModule } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';

@Module({
  imports: [BusinessModule, AvDsLibrary],
  controllers: [ConfigController],
})
export class ConfigModule {}
