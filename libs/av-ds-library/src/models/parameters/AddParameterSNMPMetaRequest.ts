import { ApiProperty } from '@nestjs/swagger';

export class AddParameterSNMPMetaRequest {
  @ApiProperty({ type: String })
  oid: string = '';
}
