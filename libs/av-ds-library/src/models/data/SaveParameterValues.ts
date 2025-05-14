import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IDeviceRawDataSave,
  IDevicesValue,
  IParameterMetaValue,
  IParameterMetaValueBase,
  IParameterValue,
  IParameterValueWithMeta,
  IParameterValueWithoutMeta,
  TParameterValue,
} from '@armax_cloud/av-models';
import { DeviceType } from '@armax_cloud/radiatics-models';

export class ParameterMetaValueBase implements IParameterMetaValueBase {
  @ApiProperty({ type: Number })
  timestamp: number = 0;

  @ApiPropertyOptional({ type: Boolean })
  quality?: boolean;
}

export class ParameterValueWithoutMeta implements IParameterValueWithoutMeta {
  @ApiProperty()
  parameters: {
    [parametername: string]: TParameterValue;
  };
}

export class ParameterValueWithMeta implements IParameterValueWithMeta {
  @ApiProperty()
  parameters: IParameterValue;

  @ApiPropertyOptional()
  parametersmeta?: IParameterMetaValue = {};
}

export class DeviceRawDataSave
  extends ParameterValueWithMeta
  implements IDeviceRawDataSave
{
  @ApiProperty({ type: Number })
  timestamp: number = 0;

  @ApiProperty({ type: Number })
  planttimestamp: number = 0;

  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  deviceip: string = '';

  @ApiProperty({ type: Number })
  devicetypeid: DeviceType = DeviceType.INV;
}

export class SaveDevicesData {
  @ApiProperty()
  data: IDevicesValue = {};

  @ApiProperty({ type: Number })
  timestamp: number = 0;
}
