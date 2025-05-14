import {
  ArmaxViewProducts,
  IArmaxViewDeviceMeta,
} from '@armax_cloud/av-models';
import {
  IDeviceOPCUAMeta,
  IOtherMeta,
  OPCUAMessageSecurityMode,
  OPCUASecurityPolicy,
} from '@armax_cloud/radiatics-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceInverterMetaUpdateRequest } from './DeviceInverterMetaUpdateRequest';
import { DeviceInverterUnitMetaUpdateRequest } from './DeviceInverterUnitMetaUpdateRequest';

export class DeviceModbusAddRequest {
  @ApiProperty({ type: Number })
  unitid: number = 1;

  @ApiPropertyOptional({ type: Number })
  timeout?: number = 2000;
}

export class DeviceOPCUAAddRequest implements IDeviceOPCUAMeta {
  @ApiPropertyOptional({ type: String })
  endpoint?: string = '';

  @ApiPropertyOptional({ type: Number })
  maxreadrecords?: number;

  @ApiProperty({ type: String })
  securitymode: OPCUAMessageSecurityMode = OPCUAMessageSecurityMode.None;

  @ApiProperty({ type: String })
  securitypolicy: OPCUASecurityPolicy = OPCUASecurityPolicy.None;

  @ApiPropertyOptional({ type: String })
  username?: string | undefined;

  @ApiPropertyOptional({ type: String })
  password?: string | undefined;

  @ApiPropertyOptional({ type: String })
  privatekey?: string | undefined;

  @ApiPropertyOptional({ type: String })
  certificate?: string | undefined;
}

export class DeviceMetaAddRequest implements IArmaxViewDeviceMeta {
  @ApiProperty({ type: () => [String] })
  deviceproducts: ArmaxViewProducts[] = [
    ArmaxViewProducts.SCADA,
    ArmaxViewProducts.PPC,
    ArmaxViewProducts.TRACKER,
  ];

  @ApiPropertyOptional({ type: () => DeviceModbusAddRequest })
  modbus?: DeviceModbusAddRequest;

  @ApiPropertyOptional({ type: () => DeviceOPCUAAddRequest })
  opcua?: DeviceOPCUAAddRequest;

  @ApiPropertyOptional({ type: () => DeviceInverterMetaUpdateRequest })
  invertermeta?: DeviceInverterMetaUpdateRequest;

  @ApiPropertyOptional({ type: () => DeviceInverterUnitMetaUpdateRequest })
  inverterunitmeta?: DeviceInverterUnitMetaUpdateRequest;

  @ApiProperty()
  othermeta: { [key: string]: IOtherMeta };
}
