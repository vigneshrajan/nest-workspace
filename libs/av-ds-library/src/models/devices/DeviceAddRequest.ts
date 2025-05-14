import {
  ArmaxViewDataSampleTypes,
  IArmaxViewDataScrapperDevice,
} from '@armax_cloud/av-models';
import { BlockType, DeviceType, PROTOCOL } from '@armax_cloud/radiatics-models';
import { CronExpression } from '@nestjs/schedule';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { string } from 'joi';
import { AddParameteRequest } from '../parameters';
import { DeviceMetaAddRequest } from './DeviceMetaAddRequest';
import { DeviceStausUpdateRequest } from './DeviceStausUpdateRequest';

export class DeviceAddRequest implements IArmaxViewDataScrapperDevice {
  @ApiProperty({ type: String })
  devicedisplayname: string;

  @ApiProperty({ type: Number })
  devicecode: number;

  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  plantid: string = '';

  @ApiProperty({ type: String })
  devicename: string = 'INVERTER';

  @ApiProperty({ type: Number })
  devicetypeid: number = DeviceType.INV;

  @ApiProperty({ type: Number })
  deviceprotocol: number = PROTOCOL.MODBUS;

  @ApiProperty({ type: Number })
  deviceport: number = 502;

  @ApiProperty({ type: String })
  devicedatafetchcron: string = CronExpression.EVERY_SECOND;

  @ApiProperty({ type: () => DeviceStausUpdateRequest })
  devicestatus: DeviceStausUpdateRequest = new DeviceStausUpdateRequest();

  @ApiPropertyOptional({ type: Boolean })
  devicevirtual?: boolean;

  @ApiPropertyOptional({ type: String })
  devicevirtualfunction?: string | undefined;

  @ApiProperty({ type: Number })
  availablesockets: number = 1;

  @ApiProperty({ type: String })
  blockid: string = '';

  @ApiProperty({ type: () => Number })
  blocktype: BlockType = BlockType.SOLAR;

  @ApiProperty({ type: () => [AddParameteRequest] })
  parameters: Array<AddParameteRequest> = [new AddParameteRequest()];

  @ApiProperty({ type: () => String })
  versionid: string = '';

  @ApiProperty({ type: () => DeviceMetaAddRequest })
  devicemeta: DeviceMetaAddRequest = new DeviceMetaAddRequest();

  @ApiProperty({ type: () => [string] })
  deviceips?: string[];

  @ApiProperty({ type: () => String })
  devicedatasampletype: ArmaxViewDataSampleTypes =
    ArmaxViewDataSampleTypes.CLASS_B;
}
