import { ModbusFunctionCode } from '@armax_cloud/radiatics-models';
import { ApiProperty } from '@nestjs/swagger';

export class AddParameterModbusMetaRequest {
  @ApiProperty({ type: Number })
  registeraddress: number = 0;

  @ApiProperty({ type: Number })
  registerlength: number = 1;

  @ApiProperty({ type: Boolean })
  littleendian: boolean = false;

  @ApiProperty({ type: Number })
  functioncode: number = ModbusFunctionCode.HOLDINGREGISTER;

  @ApiProperty({ type: String })
  group: string = '';
}
