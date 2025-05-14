import {
  IArmaxViewDataScrapperDevice,
  IDevicesValue,
  TParameterValueNotNull,
} from '@armax_cloud/av-models';
import {
  ApplicationParameter,
  IDeviceOPCUAMeta,
} from '@armax_cloud/radiatics-models';

import { DataType as AVDataType } from '@armax_cloud/radiatics-models';
import {
  DeviceRawDataSave,
  IParameterResult,
  IParameterSet,
  ProtocolWriteOpcUARequest,
  parameterScaling,
  valueRoundOff,
} from '@library/av-ds-library';
import { Injectable } from '@nestjs/common';
import { getTime } from 'date-fns';
import { chunk, groupBy, uniqBy } from 'lodash';
import { DataType, Variant } from 'node-opcua';
import { OpcuaClient } from '../class/OpcuaClient';
@Injectable()
export class OpcuaProcessUtil {
  // private _logger = new Logger(OpcuaProcessUtil.name);
  private _opcClients: { [opcInstance: string]: OpcuaClient } = {};
  constructor() {}

  private getOpcClient = async (
    deviceip: string,
    deviceport: number = 4840,
    opcuameta?: IDeviceOPCUAMeta,
  ): Promise<OpcuaClient> => {
    const identity = `${deviceip}_${deviceport}`;
    let client = this._opcClients[identity];
    if (!client) {
      client = new OpcuaClient(deviceip, deviceport, opcuameta);
      this._opcClients[identity] = client;
    }
    if (client && !client.isConnected()) {
      await client.connect();
    }
    return this._opcClients[identity];
  };

  public processOpcReadOperation = async (
    devices: IArmaxViewDataScrapperDevice[],
  ): Promise<IDevicesValue> => {
    //destructing to one object since its grouped for same client/device
    const [device] = devices;

    const parameters: Array<IParameterSet> = devices
      .map((device) =>
        device.parameters?.map(
          (parameter) =>
            <IParameterSet>{
              deviceid: device.deviceid,
              devicename: device.devicename,
              parameter,
            },
        ),
      )
      .flat(1) as Array<IParameterSet>;

    const nonVritualParameters: Array<IParameterSet> = parameters.filter(
      ({ parameter }) => !parameter.parametervirtual,
    );
    const nodeidchunk = chunk(
      nonVritualParameters,
      device.devicemeta?.opcua?.maxreadrecords ?? 1000,
    );

    if (!device.deviceips || !device.deviceips.length) {
      throw new Error('Device-ips are configured incorrectly.');
    }
    const readPromiseMap = device.deviceips.map((deviceip) =>
      this.readDataBySockets(
        nodeidchunk,
        deviceip,
        device.deviceport,
        device.devicemeta?.opcua,
      ).catch((error) => new Error(error)),
    );

    const promiseResultMap = await Promise.all(readPromiseMap);
    let promiseResult: Array<IParameterResult> = [];
    promiseResultMap.map((promiseresult) => {
      if (!(promiseresult instanceof Error)) {
        promiseResult = [...promiseResult, ...promiseresult];
      }
    });

    const deviceGroupResult = groupBy(
      promiseResult,
      (ipr: IParameterResult) => [ipr.deviceid, ipr.deviceip],
    );

    const deviceResult: { [key: string]: DeviceRawDataSave } =
      Object.fromEntries(
        Object.entries(deviceGroupResult).map(
          ([deviceIdentity, parameterResult]) => [
            deviceIdentity,
            <DeviceRawDataSave>{
              timestamp: getTime(new Date()),
              deviceid: parameterResult[0].deviceid,
              deviceip: parameterResult[0].deviceip,
              parameters: Object.fromEntries(
                parameterResult.map((parameter) => [
                  parameter.parametername,
                  parameter.parametervalue,
                ]),
              ),
              parametersmeta: Object.fromEntries(
                parameterResult.map((parameter) => [
                  parameter.parametername,
                  parameter.parametermeta,
                ]),
              ),
            },
          ],
        ),
      );

    // set health status based on chuck health response
    Object.entries(deviceGroupResult).forEach(
      ([deviceIdentity, parameterResult]) => {
        const healthstatusChunk = parameterResult.filter(
          (parameterset) =>
            parameterset.parametername ===
            ApplicationParameter.IS_HEALTHY.value,
        );

        const healthstatus = healthstatusChunk.every(
          (parameterset) => parameterset.parametervalue === true,
        );

        deviceResult[deviceIdentity].parameters[
          ApplicationParameter.IS_HEALTHY.value
        ] = healthstatus;
      },
    );
    return deviceResult;
  };

  private readDataBySockets = async (
    nodeidschunk: Array<Array<IParameterSet>>,
    deviceip: string,
    deviceport?: number,
    opcuameta?: IDeviceOPCUAMeta,
    availablesockets: number = 1,
  ) => {
    const opcresultarr: Array<IParameterResult> = [];
    if (availablesockets ?? 1 <= 1) {
      for await (const group of nodeidschunk) {
        const opcresult = await this.readOpcData(
          group,
          deviceip,
          deviceport,
          opcuameta,
        ).catch((error) => new Error(error));
        if (!(opcresult instanceof Error)) {
          opcresultarr.push(...opcresult);
        }
      }
    } else {
      const socketgroup = chunk(nodeidschunk, availablesockets);
      for await (const group of socketgroup) {
        const opcresultpromisemap = group.map((socktchunk) =>
          this.readOpcData(socktchunk, deviceip, deviceport, opcuameta).catch(
            (error) => new Error(error),
          ),
        );
        const opcresults = await Promise.all(opcresultpromisemap);
        opcresults.map((opcresult) => {
          if (!(opcresult instanceof Error)) {
            opcresultarr.push(...opcresult);
          }
        });
      }
    }
    return opcresultarr;
  };

  private getHealthTags = (
    nodeidschunk: Array<IParameterSet>,
    deviceip: string,
    status: boolean,
  ) => {
    const parameters: IParameterResult[] = [];
    const uniqdeviceids = uniqBy(nodeidschunk, (device) => device.deviceid);
    parameters.push(
      ...uniqdeviceids.map((parameterset) => ({
        deviceid: parameterset.deviceid,
        parametername: ApplicationParameter.IS_HEALTHY.value,
        devicename: parameterset.devicename,
        parametervalue: status,
        timestamp: getTime(new Date()),
        holdValue: false,
        deviceip,
        parametermeta: {
          timestamp: getTime(new Date()),
          quality: status,
        },
      })),
    );

    return parameters;
  };

  private readOpcData = async (
    nodeidschunk: Array<IParameterSet>,
    deviceip: string,
    deviceport?: number,
    opcuameta?: IDeviceOPCUAMeta,
  ): Promise<IParameterResult[]> => {
    try {
      const opcClient: OpcuaClient = await this.getOpcClient(
        deviceip,
        deviceport,
        opcuameta,
      );
      const nodeValues = await opcClient.readNodeValue(nodeidschunk);
      const parametersData: IParameterResult[] = nodeValues.map(
        (datavalue, index) => ({
          deviceid: nodeidschunk[index].deviceid,
          parametername: nodeidschunk[index].parameter.parametername,
          devicename: nodeidschunk[index].devicename,
          parametervalue: (datavalue.value.value !== null && datavalue.value.value !== undefined && datavalue.value.dataType !== DataType.Boolean ) ?
          parameterScaling(
            nodeidschunk[index].parameter,
            valueRoundOff(datavalue.value.value),
          ) : datavalue.value.value ,
          timestamp: getTime(datavalue.serverTimestamp ?? new Date()),
          holdValue: nodeidschunk[index].parameter.parameterhold,
          deviceip,
          parametermeta: {
            timestamp: getTime(datavalue.serverTimestamp ?? new Date()),
            quality: datavalue.isValid(),
          },
        }),
      );

      parametersData.push(...this.getHealthTags(nodeidschunk, deviceip, true));
      return parametersData;
    } catch (e) {
      const parametersData: IParameterResult[] = nodeidschunk
        .filter(({ parameter }) => !parameter.parameterhold)
        .map((parameterset) => ({
          deviceid: parameterset.deviceid,
          parametername: parameterset.parameter.parametername,
          devicename: parameterset.devicename,
          parametervalue: null,
          timestamp: getTime(new Date()),
          holdValue: parameterset.parameter.parameterhold,
          deviceip,
          parametermeta: {
            timestamp: getTime(new Date()),
            quality: false,
          },
        }));
      parametersData.push(...this.getHealthTags(nodeidschunk, deviceip, false));
      return parametersData;
    }
  };

  public convertToVariant(
    datatype: AVDataType,
    value: number | boolean | string,
  ): Variant {
    switch (datatype) {
      case AVDataType.BOOL:
        return new Variant({ dataType: DataType.Boolean, value });
      case AVDataType.SIGNEDINT16:
        return new Variant({ dataType: DataType.Int16, value });
      case AVDataType.UNSIGNEDINT16:
        return new Variant({ dataType: DataType.UInt16, value });
      case AVDataType.SIGNEDINT32:
        return new Variant({ dataType: DataType.Int32, value });
      case AVDataType.UNSIGNEDINT32:
        return new Variant({ dataType: DataType.UInt32, value });
      case AVDataType.SIGNEDINT64:
        return new Variant({ dataType: DataType.Int64, value });
      case AVDataType.UNSIGNEDINT64:
        return new Variant({ dataType: DataType.UInt64, value });
      case AVDataType.REAL32:
        return new Variant({ dataType: DataType.Float, value });
      case AVDataType.DOUBLE64:
        return new Variant({ dataType: DataType.Double, value });
      case AVDataType.STRING:
        return new Variant({ dataType: DataType.String, value });
      default:
        throw new Error('Unsupported data type');
    }
  }

  public processOpcuaWriteRequest = async (
    writeinstruction: ProtocolWriteOpcUARequest,
  ) => {
    const client = await this.getOpcClient(
      writeinstruction.deviceip,
      writeinstruction.deviceport,
      writeinstruction.opcuameta,
    );
    client.writeNodeValue(
      writeinstruction.nodeid,
      this.convertToVariant(writeinstruction.datatype, writeinstruction.value),
    );
  };

  public getDataType = (datatype: AVDataType, hasScale: boolean) => {
    if (hasScale) {
      switch (datatype) {
        case AVDataType.BOOL:
          return { datatype: DataType.Boolean, defaultvalue: false };
        case AVDataType.SIGNEDINT16:
        case AVDataType.UNSIGNEDINT16:
        case AVDataType.SIGNEDINT32:
        case AVDataType.UNSIGNEDINT32:
        case AVDataType.SIGNEDINT64:
        case AVDataType.UNSIGNEDINT64:
        case AVDataType.REAL32:
          return { datatype: DataType.Float, defaultvalue: 0 };
        case AVDataType.DOUBLE64:
          return { datatype: DataType.Double, defaultvalue: 0 };
        case AVDataType.STRING:
          return { datatype: DataType.String, defaultvalue: '' };
        default:
          return { datatype: DataType.Int16, defaultvalue: 0 };
      }
    } else {
      switch (datatype) {
        case AVDataType.BOOL:
          return { datatype: DataType.Boolean, defaultvalue: false };
        case AVDataType.SIGNEDINT16:
          return { datatype: DataType.Int16, defaultvalue: 0 };
        case AVDataType.UNSIGNEDINT16:
          return { datatype: DataType.UInt16, defaultvalue: 0 };
        case AVDataType.SIGNEDINT32:
          return { datatype: DataType.Int32, defaultvalue: 0 };
        case AVDataType.UNSIGNEDINT32:
          return { datatype: DataType.UInt32, defaultvalue: 0 };
        case AVDataType.SIGNEDINT64:
          return { datatype: DataType.Int64, defaultvalue: 0 };
        case AVDataType.UNSIGNEDINT64:
          return { datatype: DataType.UInt64, defaultvalue: 0 };
        case AVDataType.REAL32:
          return { datatype: DataType.Float, defaultvalue: 0 };
        case AVDataType.DOUBLE64:
          return { datatype: DataType.Double, defaultvalue: 0 };
        case AVDataType.STRING:
          return { datatype: DataType.String, defaultvalue: '' };
        default:
          return { datatype: DataType.Int16, defaultvalue: 0 };
      }
    }
  };

  public convertData = (datatype: DataType, value: TParameterValueNotNull) => {
    switch (datatype) {
      case DataType.Boolean: {
        return value !== undefined && Boolean(value);
      }
      case DataType.Int16:
      case DataType.Int32:
      case DataType.Int64:
      case DataType.UInt16:
      case DataType.UInt32:
      case DataType.UInt64: {
        return Number(value) || 0;
      }
      case DataType.Float:
      case DataType.Double: {
        return parseFloat((Number(value) || 0).toFixed(6));
      }
      case DataType.String: {
        return (value || '').toString();
      }
      default: {
        return value;
      }
    }
  };
}
