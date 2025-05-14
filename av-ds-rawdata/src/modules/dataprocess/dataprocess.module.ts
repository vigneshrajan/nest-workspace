import { AvDsLibrary } from '@library/av-ds-library';
import { Module } from '@nestjs/common';
import { DataprocessService } from './dataprocess.service';
import { DeviceLatestDataService } from './device-latest-data.service';
import { DeviceSamplerService } from './device-sampler.service';
import { DsVersionService } from './ds-version.service';

@Module({
  imports: [AvDsLibrary],
  providers: [
    DsVersionService,
    DataprocessService,
    DeviceLatestDataService,
    DeviceSamplerService,
  ],
})
export class DataprocessModule {}
