import { AvDsLibrary } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';

@Module({
  imports: [AvDsLibrary],
  providers: [TriggerService],
})
export class TriggerModule {}
