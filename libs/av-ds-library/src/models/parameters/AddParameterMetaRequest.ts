import {
  ArmaxViewProducts,
  IArmaxViewParameterMeta,
} from '@armax_cloud/av-models';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddParameterModbusMetaRequest } from './AddParameterModbusMetaRequest';
import { AddParameterOPCUAMetaRequest } from './AddParameterOPCUAMetaRequest';
import { AddParameterSNMPMetaRequest } from './AddParameterSNMPMetaRequest';

export class AddParameterMetaRequest implements IArmaxViewParameterMeta {
  @ApiPropertyOptional({ type: () => AddParameterModbusMetaRequest })
  modbus?: AddParameterModbusMetaRequest | undefined;

  @ApiPropertyOptional({ type: () => AddParameterOPCUAMetaRequest })
  opcua?: AddParameterOPCUAMetaRequest | undefined;

  @ApiPropertyOptional({ type: () => AddParameterSNMPMetaRequest })
  snmp?: AddParameterSNMPMetaRequest | undefined;

  @ApiProperty({ type: [String] })
  parameterproducts: ArmaxViewProducts[];
}
