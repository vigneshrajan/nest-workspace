import { IStatus } from '@armax_cloud/radiatics-models';
import { ApiProperty } from '@nestjs/swagger';

export class PlantStatusRequest implements IStatus {
  @ApiProperty({ type: Boolean })
  disable: boolean = false;

  @ApiProperty({ type: Boolean })
  hidden: boolean = false;
}
