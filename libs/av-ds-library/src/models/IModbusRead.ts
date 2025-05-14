import { ModbusFunctionCode } from '@armax_cloud/radiatics-models';

export interface IModbusRead {
  unitid: number;
  regaddress: number;
  reglength: number;
  fc: ModbusFunctionCode;
}
