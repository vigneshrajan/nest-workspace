import { IArmaxViewParameter } from '@armax_cloud/av-models';
import { IArmaxViewDataScrapperDevice } from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { getTime } from 'date-fns';
import lodash from 'lodash';
import { FunctionBuilder, parameterScaling } from '../services/util.service';
import { IParameterResult, DeviceRawDataSave } from '../models';
import { RedisDataService } from '../modules';
import { TParameterValue } from '@armax_cloud/av-models';
@Injectable()
export class ProtocolDataBusiness {
  constructor(private readonly _redisDataService: RedisDataService) {}

  private virtualParameterProcess = async (
    deviceid: string,
    parameter: IArmaxViewParameter,
    deviceResult: { [k: string]: TParameterValue },
    device: IArmaxViewDataScrapperDevice,
  ) => {
    if (!deviceResult) {
      throw new Error('Device result empty.');
    }

    if (!parameter.parametervirtualfunction) {
      throw new Error(`${parameter.parametername} - Virtual Function Empty`);
    }
    const parametervalue: unknown = await FunctionBuilder(
      null,
      { lodash },
      {},
      deviceResult,
      parameter.parametervirtualfunction,
      { devicemeta: device?.devicemeta },
    );

    return <IParameterResult>{
      deviceid,
      parametername: parameter.parametername,
      parametervalue: parameterScaling(parameter, parametervalue as number),
      timestamp: getTime(new Date()),
    };
  };

  private _buildVirtualParameters = async (
    virtualParameters: IArmaxViewParameter[],
    payload: DeviceRawDataSave,
    deviceConfig: IArmaxViewDataScrapperDevice,
  ) => {
    const dataPromiseMap = virtualParameters.map((parameter) =>
      this.virtualParameterProcess(
        payload.deviceid,
        parameter,
        payload.parameters,
        deviceConfig,
      ).catch((error) => new Error(error)),
    );
    const dataresult = await Promise.all(dataPromiseMap);
    const result = dataresult.filter(
      (f) => !(f instanceof Error),
    ) as IParameterResult[];
    return Object.fromEntries(
      result.map((r) => [r.parametername, r.parametervalue]),
    );
  };

  saveDeviceLatestData = async (payload: DeviceRawDataSave) => {
    let tempdatapayload: DeviceRawDataSave = { ...payload };
    const deviceConfigJson = await this._redisDataService.getDataByKey(
      `DEVICECONFIG-${tempdatapayload.deviceid}`,
    );

    if (!deviceConfigJson) {
      return;
    }

    const redisdatastring = await this._redisDataService.getDataByKey(
      `${tempdatapayload.deviceid}-${tempdatapayload.deviceip}-current`,
    );

    if (redisdatastring) {
      const redisdata: DeviceRawDataSave = JSON.parse(redisdatastring);
      tempdatapayload = {
        ...redisdata,
        ...tempdatapayload,
        parameters: {
          ...redisdata.parameters,
          ...tempdatapayload.parameters,
        },
        parametersmeta: {
          ...redisdata.parametersmeta,
          ...tempdatapayload.parametersmeta,
        },
      };
    }

    const deviceConfig: IArmaxViewDataScrapperDevice =
      JSON.parse(deviceConfigJson);
    const virtualParameters =
      deviceConfig.parameters?.filter(
        (parameter) => parameter.parametervirtual,
      ) ?? [];
    const virtualParameterResult = await this._buildVirtualParameters(
      virtualParameters,
      tempdatapayload,
      deviceConfig,
    );

    const devicedata = {
      ...tempdatapayload,
      parameters: {
        ...tempdatapayload.parameters,
        ...virtualParameterResult,
      },
      parametersmeta: {
        ...tempdatapayload.parametersmeta,
        ...Object.fromEntries(
          virtualParameters.map((parameter) => [
            parameter.parametername,
            { timestamp: getTime(new Date()) },
          ]),
        ),
      },
    };

    await this._redisDataService.setDataByKey(
      `${tempdatapayload.deviceid}-${tempdatapayload.deviceip}-current`,
      JSON.stringify(devicedata),
    );
  };
}
