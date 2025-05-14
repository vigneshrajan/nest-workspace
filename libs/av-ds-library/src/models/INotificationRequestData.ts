import { IParameterValueWithMeta } from '@armax_cloud/av-models';

export interface IParameterChangedData {
  [parametername: string]: string | number | boolean | Date | null;
}

export interface IDeviceChangedData {
  parameters: IParameterChangedData;
}

export interface IDeviceDataDifference extends IParameterValueWithMeta {
  deviceid: string;
  deviceip: string;
  redundant: boolean;
  ismaster: boolean;
}
