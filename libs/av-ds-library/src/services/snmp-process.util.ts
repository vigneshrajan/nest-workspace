import {
  IArmaxViewDataScrapperDevice,
  IDevicesValue,
} from '@armax_cloud/av-models/models';
import { ApplicationParameter } from '@armax_cloud/radiatics-models';
import { Logger } from '@nestjs/common';
import { getTime } from 'date-fns';
import { chunk, groupBy, uniqBy } from 'lodash';
import { SnmpClient } from '../class';
import {
  DeviceRawDataSave,
  IParameterResult,
  IParameterSet,
  ProtocolWriteSnmpRequest,
} from '../models';
import { Config } from '../app.config';

export class SnmpProcessUtil {
  private _logger = new Logger(SnmpProcessUtil.name);
  private _clients: { [snmpInstance: string]: SnmpClient } = {};
  constructor() {}

  private getSnmpClient = (deviceip: string, deviceport: number = 4840) => {
    const identity = `${deviceip}_${deviceport}`;
    let client = this._clients[identity];
    if (!client) {
      client = new SnmpClient(deviceip, deviceport);
      this._clients[identity] = client;
    }
    return this._clients[identity];
  };

  private getHealthTags = (
    oidschunk: Array<IParameterSet>,
    deviceip: string,
    status: boolean,
  ) => {
    const parameters: IParameterResult[] = [];
    const uniqdeviceids = uniqBy(oidschunk, (device) => device.deviceid);
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

  private readSnmpData = async (
    oidschunk: Array<IParameterSet>,
    deviceip: string,
    deviceport?: number,
  ) => {
    try {
      const snmpClient: SnmpClient = this.getSnmpClient(deviceip, deviceport);

      const oidObject = Object.fromEntries(
        oidschunk.map((oid) => [
          oid.parameter.parametermeta.snmp!.oid.replace(/^\./, ''),
          oid,
        ]),
      );
      const iodValues = await snmpClient.read(Object.keys(oidObject));

      const parametersData: IParameterResult[] = Object.entries(iodValues).map(
        ([oid, value]) => {
          const parameter = oidObject[oid];
          return {
            deviceid: parameter.deviceid,
            devicename: parameter.devicename,
            deviceip,
            parametername: parameter.parameter.parametername,
            parametervalue: value,
            holdValue: parameter.parameter.parameterhold,
            parametermeta: {
              timestamp: getTime(new Date()),
            },
          };
        },
      );
      parametersData.push(...this.getHealthTags(oidschunk, deviceip, false));
      return parametersData;
    } catch (error) {
      if (Config.logger.debug) {
        this._logger.error(error);
      }
      const parametersData: IParameterResult[] = oidschunk
        .filter(({ parameter }) => !parameter.parameterhold)
        .map((parameterset) => ({
          deviceid: parameterset.deviceid,
          devicename: parameterset.devicename,
          deviceip,
          parametername: parameterset.parameter.parametername,
          parametervalue: null,
          holdValue: parameterset.parameter.parameterhold,
          parametermeta: {
            timestamp: getTime(new Date()),
          },
        }));
      parametersData.push(...this.getHealthTags(oidschunk, deviceip, false));
      return parametersData;
    }
  };

  private readDataByIp = async (
    oidschunk: Array<Array<IParameterSet>>,
    deviceip: string,
    deviceport: number,
    availablesockets: number = 1,
  ) => {
    const opcresultarr: Array<IParameterResult> = [];
    if (availablesockets ?? 1 <= 1) {
      for await (const group of oidschunk) {
        const snmpresult = await this.readSnmpData(
          group,
          deviceip,
          deviceport,
        ).catch((error) => new Error(error));

        if (!(snmpresult instanceof Error)) {
          opcresultarr.push(...snmpresult);
        }
      }
    } else {
      const socketgroup = chunk(oidschunk, availablesockets);
      for await (const group of socketgroup) {
        const opcresultpromisemap = group.map((socktchunk) =>
          this.readSnmpData(socktchunk, deviceip, deviceport).catch(
            (error) => new Error(error),
          ),
        );
        const snmpresults = await Promise.all(opcresultpromisemap);
        snmpresults.map((opcresult) => {
          if (!(opcresult instanceof Error)) {
            opcresultarr.push(...opcresult);
          }
        });
      }
    }

    return opcresultarr;
  };

  processSnmpReadOperations = async (
    devices: IArmaxViewDataScrapperDevice[],
  ): Promise<IDevicesValue> => {
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
      this.readDataByIp(nodeidchunk, deviceip, device.deviceport!).catch(
        (error) => new Error(error),
      ),
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

  processSnmpWriteRequest = async (
    writeinstruction: ProtocolWriteSnmpRequest,
  ) => {
    const client = this.getSnmpClient(
      writeinstruction.deviceid,
      writeinstruction.deviceport,
    );

    await client.write([{ ...writeinstruction }]);
  };
}
