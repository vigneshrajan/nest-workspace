import {
  ApplicationParameter,
  DataType,
  IParameterModbusMeta,
} from '@armax_cloud/radiatics-models';

import {
  IArmaxViewDataScrapperDevice,
  IArmaxViewParameter,
} from '@armax_cloud/av-models';
import { Logger } from '@nestjs/common';
import { chunk, groupBy, max, maxBy, min, minBy, sortBy, uniqBy } from 'lodash';

import {
  Config,
  DeviceRawDataSave,
  IParameterResult,
  IParameterSet,
  ProtocolWriteModbusRequest,
  modbusDataConvert,
  parameterScaling,
} from '@library/av-ds-library';
import { IModbusRead } from '@library/av-ds-library/models/IModbusRead';
import { getTime } from 'date-fns';
import { ModbusClient } from '../class';
export class ModbusProcessUtil {
  private _logger = new Logger(ModbusProcessUtil.name);
  private _modbusClients: { [identity: string]: ModbusClient } = {};
  constructor() {}

  private buildParameterData = (
    parameter: IArmaxViewParameter,
    datamap: { [k: string]: number },
    devicesourcedata: Array<number | boolean>,
  ): number | bigint | boolean => {
    let parametervalue;
    const { littleendian, registeraddress } = parameter.parametermeta
      .modbus as IParameterModbusMeta;

    parametervalue = modbusDataConvert(
      parameter.parameterdatatype,
      devicesourcedata,
      registeraddress ? datamap[registeraddress] : 0,
      littleendian,
    );

    if (
      (parameter.parameterdatatype === DataType.REAL32 ||
        parameter.parameterdatatype === DataType.DOUBLE64) &&
      (typeof parametervalue === 'number' || typeof parametervalue === 'bigint')
    ) {
      parametervalue = parseFloat(
        parseFloat(parametervalue.toString()).toFixed(4),
      );
    }
    parametervalue = parameterScaling(parameter, parametervalue as number);
    return parametervalue;
  };

  private getClient = async (
    ip: string,
    port: number,
    connectionTimeout: number = 2000,
  ): Promise<ModbusClient> => {
    const identity = `${ip}_${port}`;
    let client = this._modbusClients[identity];
    if (!client) {
      client = new ModbusClient(ip, port);
      this._modbusClients[identity] = client;
    }
    await client.connect(connectionTimeout);
    return client;
  };

  private modbusRegisterCalculator = (
    group: Array<{
      deviceid: string;
      parameter: IArmaxViewParameter;
    }>,
    unitid: number,
  ): IModbusRead => {
    const regaddress =
      minBy(
        group,
        ({ parameter }) =>
          (parameter.parametermeta.modbus?.registeraddress ?? 0) +
          (parameter.parametermeta.modbus?.registerlength ?? 0),
      )?.parameter.parametermeta.modbus?.registeraddress ?? 0;

    const lastRegister = maxBy(
      group,
      ({ parameter }) =>
        (parameter.parametermeta.modbus?.registeraddress ?? 0) +
        (parameter.parametermeta.modbus?.registerlength ?? 0),
    )?.parameter.parametermeta.modbus;

    return {
      regaddress,
      reglength:
        (lastRegister?.registeraddress ?? 0) +
        (lastRegister?.registerlength ?? 0) -
        regaddress,
      fc: group[0].parameter.parametermeta.modbus?.functioncode ?? 1,
      unitid: unitid,
    };
  };

  private getDataForDevice = async (
    client: ModbusClient | null,
    deviceip: string,
    device: IArmaxViewDataScrapperDevice,
    parameters: Array<IParameterSet>,
    unitid: number,
  ) => {
    const uniqDevices: Array<IParameterSet> = uniqBy(
      parameters,
      (parameter: IParameterSet) => parameter.deviceid,
    );

    const deviceHealthyParameters = uniqDevices.map(
      ({ deviceid, devicename }) => ({
        deviceid,
        deviceip,
        devicename,
        parametername: ApplicationParameter.IS_HEALTHY.value,
        parametervalue: null,
        holdValue: false,
        parametermeta: {
          timestamp: getTime(new Date()),
        },
      }),
    );

    try {
      if (!client) {
        throw new Error('Modbus Client instance not available');
      }

      const config: IModbusRead = {
        ...this.modbusRegisterCalculator(parameters, unitid),
      };

      if (!client.isConnected) {
        throw new Error('Modbus Client not connected');
      }

      await client.read(config).catch((e: any) => {
        throw new Error(JSON.stringify({ ...config, ...e }));
      });

      const resultData = await client.read(config);
      const dataarray = resultData?.data ?? [];

      const datamap = Object.fromEntries(
        Array.from({ length: config.reglength }).map((_, index: number) => [
          config.regaddress + index,
          index,
        ]),
      );
      const parametersData: IParameterResult[] = parameters.map(
        ({
          deviceid,
          parameter,
        }: {
          deviceid: string;
          parameter: IArmaxViewParameter;
        }) => ({
          deviceid,
          deviceip,
          devicename: device.devicename,
          parametername: parameter.parametername,
          parametervalue: this.buildParameterData(
            parameter,
            datamap,
            dataarray,
          ),
          holdValue: parameter.parameterhold,
          parametermeta: {
            timestamp: getTime(new Date()),
          },
        }),
      );
      return [
        ...parametersData,
        ...deviceHealthyParameters.map((parameterValue) => ({
          ...parameterValue,
          parametervalue: true,
        })),
      ];
    } catch (error) {
      // console.log('Error : ', deviceip, error.message);
      if (Config.logger.debug) {
        this._logger.error(error);
        if (client) {
          client.disconnect();
        }
      }

      const parametersData: IParameterResult[] = parameters.map(
        ({ deviceid, devicename, parameter }) => ({
          deviceid,
          deviceip,
          devicename,
          parametername: parameter.parametername,
          parametervalue: null,
          holdValue: parameter.parameterhold,
          parametermeta: {
            timestamp: getTime(new Date()),
          },
        }),
      );

      return [
        ...parametersData,
        ...deviceHealthyParameters.map((parameterValue) => ({
          ...parameterValue,
          parametervalue: false,
        })),
      ];
    }
  };

  private getOperationSets = (
    startAddress: number,
    parameterItems: Array<IParameterSet>,
  ): Array<Array<IParameterSet>> => {
    // check requestStartAddress to proceed futher, or will return empty array
    const requestStartAddress = sortBy(
      parameterItems,
      (x) => x.parameter.parametermeta?.modbus?.registeraddress,
    ).find(
      (f) =>
        f.parameter.parametermeta?.modbus?.registeraddress !== undefined &&
        f.parameter.parametermeta?.modbus?.registeraddress >= startAddress,
    )?.parameter.parametermeta.modbus?.registeraddress;
    if (requestStartAddress === undefined || requestStartAddress == null) {
      return [];
    }
    // get next set of 125 registers
    const currentOperationSet = parameterItems.filter(
      (f) =>
        f.parameter.parametermeta?.modbus?.registeraddress !== undefined &&
        f.parameter.parametermeta?.modbus?.registeraddress >=
          requestStartAddress &&
        f.parameter.parametermeta?.modbus?.registeraddress +
          f.parameter.parametermeta.modbus.registerlength -
          1 -
          requestStartAddress <=
          125,
    );

    const { registeraddress, registerlength } = maxBy(
      currentOperationSet,
      ({ parameter }) => parameter.parametermeta?.modbus?.registeraddress,
    )?.parameter.parametermeta.modbus as {
      registeraddress: number;
      registerlength: number;
    };

    return [
      currentOperationSet,
      ...this.getOperationSets(
        registeraddress + registerlength,
        parameterItems,
      ),
    ];
  };

  private groupByOperation = (parameters: Array<IParameterSet>) => {
    const readParameters = parameters.filter(
      ({ parameter }) => parameter.parameterread,
    );

    const functionCodeGroup = groupBy(
      readParameters,
      ({ parameter, unitid }) => [
        unitid,
        parameter?.parametermeta?.modbus?.functioncode,
        parameter?.parametermeta.modbus?.group,
      ],
    );

    return Object.entries(functionCodeGroup)
      .map(([, groupItems]: [string, IParameterSet[]]) =>
        this.getOperationSets(0, groupItems),
      )
      .flat(1);
  };

  private readModbusData = async (
    devices: IArmaxViewDataScrapperDevice[],
    deviceip: string,
    port: number,
    availablesockets: number,
    connectionTimeout?: number,
  ): Promise<IParameterResult[]> => {
    const client = await this.getClient(
      deviceip,
      port,
      connectionTimeout,
    ).catch((error) => {
      this._logger.error(error);
      return null;
    });

    const parameters: Array<IParameterSet> = devices
      .map((device) =>
        device.parameters?.map(
          (parameter) =>
            <IParameterSet>{
              deviceid: device.deviceid,
              devicename: device.devicename,
              unitid: device.devicemeta?.modbus?.unitid,
              parameter,
            },
        ),
      )
      .flat(1) as Array<IParameterSet>;

    const nonVritualParameters = parameters.filter(
      ({ parameter }) => !parameter.parametervirtual,
    );

    const operationGroups = this.groupByOperation(nonVritualParameters);

    const deviceObject = Object.fromEntries(
      devices.map((device: IArmaxViewDataScrapperDevice) => [
        device.deviceid,
        device,
      ]),
    );

    let parameterResult: Array<IParameterResult> = [];
    const _timeout = min([max([2000, operationGroups.length * 1000]), 30000]);
    const [{ unitid }] = parameters;
    if (client) {
      client.setClientTimeout(_timeout);
      client.setUnitId(unitid);
    }

    if (availablesockets === 1) {
      for await (const group of operationGroups) {
        const [{ deviceid }] = group;
        const data = await this.getDataForDevice(
          client,
          deviceip,
          deviceObject[deviceid],
          group,
          unitid,
        );
        parameterResult = [...parameterResult, ...data];
        // if (deviceip === '192.168.7.7') {
        //   console.log(new Date().toTimeString(), 'Data:', data);
        // }
      }
    } else {
      const parellelRequest = chunk(operationGroups, availablesockets);
      for await (const parallelGroup of parellelRequest) {
        const promiseMap = parallelGroup.map((group) => {
          const [{ deviceid }] = group;
          return this.getDataForDevice(
            client,
            deviceip,
            deviceObject[deviceid],
            group,
            unitid,
          );
        });
        const data = await Promise.all(promiseMap);
        parameterResult = [...parameterResult, ...data.flat(1)];
      }
    }

    const deviceHealthyStatus = parameterResult
      .filter((x) => x.parametername === ApplicationParameter.IS_HEALTHY.value)
      .every((x) => x.parametervalue);

    parameterResult = parameterResult.filter(
      (x) => x.parametername !== ApplicationParameter.IS_HEALTHY.value,
    );

    parameterResult.push(
      ...Object.entries(deviceObject).map(
        ([deviceid, device]: [string, IArmaxViewDataScrapperDevice]) => ({
          deviceid,
          deviceip: deviceip,
          devicename: device.devicename,
          parametername: ApplicationParameter.IS_HEALTHY.value,
          parametervalue: deviceHealthyStatus,
          parametermeta: {
            timestamp: getTime(new Date()),
          },
        }),
      ),
    );

    return parameterResult;
  };

  private convertWriteData = (
    datatype: DataType,
    value: number | boolean,
    littleendian: boolean,
  ) => {
    switch (datatype) {
      case DataType.BOOL:
        return [value === 1 || value === true];
      case DataType.SIGNEDINT16: {
        const buf = Buffer.alloc(2);
        buf.writeInt16BE(Number(value));
        return [buf.readUInt16BE(0)];
      }
      case DataType.UNSIGNEDINT16: {
        const buf = Buffer.alloc(2);
        buf.writeUInt16BE(Number(value));
        return [buf.readUInt16BE(0)];
      }
      case DataType.SIGNEDINT32: {
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(Number(value));
        return [buf.readUInt16BE(0), buf.readUInt16BE(2)];
      }
      case DataType.UNSIGNEDINT32: {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(Number(value));
        return [buf.readUInt16BE(0), buf.readUInt16BE(2)];
      }
      case DataType.SIGNEDINT64: {
        const buf = Buffer.alloc(8);
        buf.writeBigInt64BE(BigInt(value));
        return [
          buf.readUInt16BE(0),
          buf.readUInt16BE(2),
          buf.readUInt16BE(4),
          buf.readUInt16BE(6),
        ];
      }
      case DataType.UNSIGNEDINT64: {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64BE(BigInt(value));
        return [
          buf.readUInt16BE(0),
          buf.readUInt16BE(2),
          buf.readUInt16BE(4),
          buf.readUInt16BE(6),
        ];
      }
      case DataType.REAL32: {
        const buf = Buffer.alloc(4);
        buf.writeFloatBE(Number(value));
        return [
          buf.readUInt16BE(littleendian ? 2 : 0),
          buf.readUInt16BE(littleendian ? 0 : 2),
        ];
      }
      case DataType.DOUBLE64: {
        const buf = Buffer.alloc(8);
        buf.writeDoubleBE(Number(value));
        return [
          buf.readUInt16BE(littleendian ? 6 : 0),
          buf.readUInt16BE(littleendian ? 4 : 2),
          buf.readUInt16BE(littleendian ? 2 : 4),
          buf.readUInt16BE(littleendian ? 0 : 6),
        ];
      }
      default:
        throw new Error('Invalid Datatype.');
    }
  };

  readOperation = async (devices: IArmaxViewDataScrapperDevice[]) => {
    const [device] = devices;
    if (!device.deviceips || !device.deviceips.length) {
      throw new Error('Device-ips are configured incorrectly.');
    }
    const readPromiseMap = device.deviceips.map((deviceip) =>
      this.readModbusData(
        devices,
        deviceip,
        device.deviceport ?? 502,
        min(devices.map((device) => device.availablesockets)) ?? 1,
        device.devicemeta?.modbus?.timeout,
      ).catch((error) => new Error(error)),
    );
    const promiseResult = await Promise.all(readPromiseMap);
    const resultData = promiseResult
      .filter((value) => !(value instanceof Error))
      .flat(1) as IParameterResult[];
    const deviceGroupResult = groupBy(resultData, (r: IParameterResult) => [
      r.deviceid,
      r.deviceip,
    ]);

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

  writeOperation = async (payload: ProtocolWriteModbusRequest) => {
    const client = await this.getClient(payload.deviceip, payload.deviceport);

    if (!client || !client.isConnected) {
      throw new Error('Client not connected');
    }
    client.setUnitId(payload.modbusmeta.unitid);
    client.setClientTimeout(2000);
    const resultdata = this.convertWriteData(
      payload.datatype,
      payload.value,
      payload.islittleendian,
    );

    await client.write(
      payload.regaddress,
      resultdata,
      payload.datatype === DataType.BOOL,
    );
  };
}
