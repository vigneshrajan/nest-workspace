import { IDeviceStatus } from '@armax_cloud/radiatics-models';
import { ApiProperty } from '@nestjs/swagger';

export class DeviceStausUpdateRequest implements IDeviceStatus {
  @ApiProperty({ type: Boolean })
  disable: boolean = false;

  @ApiProperty({ type: Boolean })
  communicationalarmenabled: boolean = true;

  @ApiProperty({ type: Boolean })
  communicationeventenabled: boolean = false;

  @ApiProperty({ type: Boolean })
  hidden: boolean = false;
}
