import { IArmaxViewParameter } from '@armax_cloud/av-models';
export interface IParameterResultMeta {
  timestamp: number;
  quality?: boolean | number;
}

export interface IParameterResult {
  deviceid: string;
  parametername: string;
  devicename: string;
  parametervalue: number | bigint | boolean | string | null;
  timestamp?: number;
  holdValue?: boolean;
  deviceip: string;
  parametermeta: IParameterResultMeta;
}

export interface IParameterSet {
  deviceid: string;
  unitid: number;
  parameter: IArmaxViewParameter;
  devicename: string;
}
