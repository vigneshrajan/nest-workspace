import {
  IArmaxViewBlockCommunication,
  IArmaxViewCommunication,
  IDeviceRawBaseDataSave,
  TParameterValue,
} from '@armax_cloud/av-models';
import { DeviceType } from '@armax_cloud/radiatics-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IResponse } from './IResponse';

export class CommunicationDevice implements IDeviceRawBaseDataSave {
  @ApiProperty({ type: String })
  deviceid: string = '';

  @ApiProperty({ type: String })
  deviceip: string = '';

  @ApiProperty({ type: Number })
  devicetypeid: DeviceType = DeviceType.INV;

  @ApiProperty({ type: Object })
  parameters: {
    [parametername: string]: TParameterValue;
  };

  @ApiPropertyOptional({ type: Object })
  parametersmeta?: {
    [parametername: string]: {
      timestamp: number;
      quality?: boolean;
    };
  };
}

export class CommunicationBlock implements IArmaxViewBlockCommunication {
  @ApiProperty({ type: String })
  blockid: string = '';

  @ApiProperty({ type: String })
  blockip: string = '';

  @ApiProperty({ type: Boolean })
  status: boolean = false;
}

export class ResponseCommunicationBase implements IArmaxViewCommunication {
  @ApiProperty({ type: () => [CommunicationBlock] })
  blocks: CommunicationBlock[] = [new CommunicationBlock()];

  @ApiProperty({ type: () => [CommunicationDevice] })
  devices: CommunicationDevice[] = [new CommunicationDevice()];
}

export class ResponseCommunication implements IResponse {
  @ApiPropertyOptional({ type: () => ResponseCommunicationBase })
  data?: ResponseCommunicationBase = new ResponseCommunicationBase();

  @ApiProperty({ type: Boolean })
  error = false;

  @ApiPropertyOptional({ type: String })
  errormessage?: string | null;

  @ApiPropertyOptional({ type: String })
  logid?: string | null;
}
