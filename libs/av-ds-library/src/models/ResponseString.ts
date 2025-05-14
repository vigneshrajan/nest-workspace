import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IResponse } from './IResponse';

export class ResponseString implements IResponse {
  @ApiPropertyOptional({ type: String })
  data?: string;

  @ApiProperty({ type: Boolean })
  error = false;

  @ApiPropertyOptional({ type: String })
  errormessage?: string | null;

  @ApiPropertyOptional({ type: String })
  logid?: string | null;
}
