import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IResponse } from './IResponse';

export class ResponseBoolean implements IResponse {
  @ApiPropertyOptional({ type: Boolean })
  data?: boolean;

  @ApiProperty({ type: Boolean })
  error = false;

  @ApiPropertyOptional({ type: String })
  errormessage?: string | null;

  @ApiPropertyOptional({ type: String })
  logid?: string | null;
}
