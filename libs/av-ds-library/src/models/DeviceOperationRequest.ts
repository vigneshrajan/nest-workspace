import { DataType } from '@armax_cloud/radiatics-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceModbusAddRequest, DeviceOPCUAAddRequest } from './devices';
import { DataTypes } from 'snmp-native';

export class DeviceOperationWriteModbusRequest {
  @ApiProperty({ type: Number })
  regaddress: number = 0;

  @ApiProperty({ type: Number })
  datatype: DataType = DataType.BOOL;

  @ApiProperty({ type: Boolean })
  islittleendian: boolean = false;

  @ApiProperty({
    type: Object,
    oneOf: [{ type: 'number' }, { type: 'boolean' }],
  })
  value: number | boolean = 0 || false;
}

export class ProtocolWriteModbusRequest extends DeviceOperationWriteModbusRequest {
  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  deviceip: string = '';

  @ApiProperty({ type: Number })
  deviceport: number = 502;

  @ApiPropertyOptional({ type: () => DeviceModbusAddRequest })
  modbusmeta: DeviceModbusAddRequest;
}

export class DeviceOperationWriteOpcUARequest {
  @ApiProperty({ type: String })
  nodeid: string = 'ns=0;s=Act_Pwr';

  @ApiProperty({ type: Number })
  datatype: DataType = DataType.SIGNEDINT16;

  @ApiProperty({
    type: Object,
    oneOf: [{ type: 'number' }, { type: 'boolean' }],
  })
  value: number | boolean = 0 || false;
}

export class ProtocolWriteOpcUARequest extends DeviceOperationWriteOpcUARequest {
  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  deviceip: string = '';

  @ApiProperty({ type: Number })
  deviceport: number = 502;

  @ApiPropertyOptional({ type: () => DeviceOPCUAAddRequest })
  opcuameta?: DeviceOPCUAAddRequest;
}

export type TSnmpDataType = DataTypes[keyof DataTypes] | null | undefined;

export class DeviceOperationWriteSnmpRequest {
  @ApiProperty({ type: String })
  oid: string = '';

  @ApiProperty({})
  type: TSnmpDataType = DataTypes.Integer;

  @ApiProperty({})
  value: any = null;
}

export class ProtocolWriteSnmpRequest extends DeviceOperationWriteSnmpRequest {
  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  deviceip: string = '';

  @ApiProperty({ type: Number })
  deviceport: number = 502;
}

export class DeviceOperationWriteRequest {
  @ApiPropertyOptional({ type: String })
  prerunfunction?: string = '';

  @ApiPropertyOptional({ type: () => DeviceOperationWriteModbusRequest })
  modbusmeta?: DeviceOperationWriteModbusRequest =
    new DeviceOperationWriteModbusRequest();

  @ApiPropertyOptional({ type: () => DeviceOperationWriteOpcUARequest })
  opcuameta?: DeviceOperationWriteOpcUARequest =
    new DeviceOperationWriteOpcUARequest();

  @ApiPropertyOptional({ type: () => DeviceOperationWriteSnmpRequest })
  snmpmeta?: DeviceOperationWriteSnmpRequest =
    new DeviceOperationWriteSnmpRequest();
}
