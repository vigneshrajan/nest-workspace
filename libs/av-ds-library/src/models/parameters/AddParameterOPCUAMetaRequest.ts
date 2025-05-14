import { ApiProperty } from '@nestjs/swagger';

export class AddParameterOPCUAMetaRequest {
  @ApiProperty({ type: String })
  nodeid: string = '';
}
