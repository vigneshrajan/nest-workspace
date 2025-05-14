import { IStatus } from '@armax_cloud/radiatics-models';
import { ApiProperty } from '@nestjs/swagger';

export class StatusRequest implements IStatus {
  @ApiProperty({ type: Boolean })
  disable: boolean = false;

  @ApiProperty({ type: Boolean })
  hidden: boolean = false;
}
