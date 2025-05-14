import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { AvDsLibrary } from '@library/av-ds-library';

@Module({
  imports: [AvDsLibrary],
  controllers: [CommunicationController],
})
export class CommunicationModule {}
