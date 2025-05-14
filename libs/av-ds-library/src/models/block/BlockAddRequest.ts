import { IArmaxViewDataScrapperBlock } from '@armax_cloud/av-models';
import { BlockType } from '@armax_cloud/radiatics-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusRequest } from '../StatusRequest';

export class BlockAddRequest implements IArmaxViewDataScrapperBlock {
  @ApiPropertyOptional({ type: String })
  _id?: string | any;

  @ApiPropertyOptional({ type: String })
  blockid: string | any;

  @ApiProperty({ type: String })
  plantid: string;

  @ApiProperty({ type: String })
  blockname: string;

  @ApiProperty({ type: String })
  blockdisplayname: string;

  @ApiProperty({ type: [String] })
  blockips: string[];

  @ApiPropertyOptional({ type: Number })
  blocksortorder?: number;

  @ApiPropertyOptional({ type: Boolean })
  blockvirtual?: boolean;

  @ApiPropertyOptional({ type: String })
  blockvirtualfunction?: string;

  @ApiPropertyOptional({ type: () => StatusRequest })
  blockstatus?: StatusRequest;

  @ApiPropertyOptional({ type: () => Number })
  blocktype?: BlockType;

  @ApiProperty({ type: () => String })
  versionid: string = '';
}
