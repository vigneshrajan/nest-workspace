import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceInverterMetaUpdateRequest {
  @ApiProperty({ type: Boolean })
  istracker: boolean = false;

  @ApiProperty({ type: [String] })
  wmsdevices: string[] = [];

  @ApiProperty({ type: Number })
  accapacity: number = 0;

  @ApiProperty({ type: Number })
  dccapacity: number = 0;

  @ApiPropertyOptional({ type: Number })
  connectedmodules?: number;
}
