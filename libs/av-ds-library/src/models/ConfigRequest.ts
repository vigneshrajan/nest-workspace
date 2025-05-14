import { ApiProperty } from '@nestjs/swagger';
import { DeviceAddRequest } from './devices/DeviceAddRequest';
import { PlantConfig } from './plant/PlantConfig';
import { BlockAddRequest } from './block/BlockAddRequest';

export class ConfigRequest {
  @ApiProperty({ type: String })
  plantid: string = '';

  @ApiProperty({ type: () => PlantConfig })
  plant: PlantConfig = new PlantConfig();

  @ApiProperty({ type: () => [BlockAddRequest] })
  blocks: Array<BlockAddRequest> = [new BlockAddRequest()];

  @ApiProperty({ type: () => [DeviceAddRequest] })
  devices: Array<DeviceAddRequest> = [new DeviceAddRequest()];
}
