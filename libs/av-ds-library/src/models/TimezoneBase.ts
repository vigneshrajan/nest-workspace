import { ApiProperty } from '@nestjs/swagger';

export class TimezoneBase {
  @ApiProperty()
  name: string = '';

  @ApiProperty()
  utcOffset: number = 0;

  @ApiProperty()
  dstOffset: number = 0;
}
