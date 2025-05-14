import {
  AggregateType,
  ApplicationParameter,
  DataType,
} from '@armax_cloud/radiatics-models';

import {
  IArmaxViewDataScrapperDevice,
  IArmaxViewDataScrapperPlant,
  IArmaxViewDeviceRawData,
  IArmaxViewDeviceRawDataSample,
  IDeviceRawDataSave,
  IParameterValueWithoutMeta,
  TParameterValue,
} from '@armax_cloud/av-models';

import { RedisDataService, valueRoundOff } from '@library/av-ds-library';
import { DeviceDataSamplerBusiness } from '@library/av-ds-library/business/devicedatasample.business';
import { DeviceRawDataBusiness } from '@library/av-ds-library/business/devicerawdata.business';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { addMinutes, getTime, startOfMinute, startOfSecond } from 'date-fns';
import { groupBy, max, mean, min, orderBy, sum } from 'lodash';

@Injectable()
export class DeviceSamplerService implements OnModuleInit {
  private devicesObject: { [deviceid: string]: IArmaxViewDataScrapperDevice } =
    {};
  private plant: IArmaxViewDataScrapperPlant;
  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _deviceRawDataBusiness: DeviceRawDataBusiness,
    private readonly _deviceDataSamplerBusiness: DeviceDataSamplerBusiness,
  ) {}

  onModuleInit = async () => {
    const redisDeviceKeys =
      await this._redisDataService.getKeys('DEVICECONFIG-*');

    this.plant = await this._redisDataService.getPlant();
    this.devicesObject = Object.fromEntries(
      (await this._redisDataService.getDataByKeys(redisDeviceKeys))
        .filter((device) => device !== null)
        .map((device: string) => {
          const deviceObject = <IArmaxViewDataScrapperDevice>JSON.parse(device);
          return [deviceObject.deviceid, deviceObject];
        }),
    );
  };

  processDeviceDataSampler = async (device: IArmaxViewDataScrapperDevice) => {
    const timestamp = getTime(startOfSecond(new Date()));
    const planttimestamp = getTime(
      addMinutes(timestamp, this.plant.planttimezone?.utcOffset ?? 0),
    );
    const redisDataString = (device.deviceips || []).map(
      (deviceip) => `${device.deviceid}-${deviceip}-current`,
    );

    const deviceLatestData = orderBy(
      (await this._redisDataService.getDataByKeys(redisDataString))
        .filter((latestData) => latestData !== null)
        .map(
          (latedtData: string) => <IDeviceRawDataSave>JSON.parse(latedtData),
        ),
      (latedtData) => latedtData.timestamp,
      'desc',
    );

    const data =
      deviceLatestData.find(
        (latestdata) =>
          (device.deviceips && device.deviceips.length <= 1) ||
          (latestdata.parameters[ApplicationParameter.IS_HEALTHY.value] &&
            latestdata.parameters[ApplicationParameter.IS_MASTER.value]),
      ) ??
      deviceLatestData.find(
        (latestdata) =>
          (device.deviceips && device.deviceips.length <= 1) ||
          latestdata.parameters[ApplicationParameter.IS_HEALTHY.value],
      ) ??
      deviceLatestData?.[0];

    const plant = await this._redisDataService.getPlant();
    if (data) {
      const rawdata: IArmaxViewDeviceRawDataSample = {
        timestamp,
        planttimestamp,
        plantid: plant._id,
        deviceid: data.deviceid,
        data: data.parameters,
        readytodelete: false,
      };
      await this._deviceDataSamplerBusiness.saveDeviceSampleData(rawdata);
    }
  };

  private aggregateParameter = (
    parameteraggregatetype: AggregateType,
    parameterdata: Array<TParameterValue>,
    parameterdatatype: DataType,
  ) => {
    if (
      parameterdata.length > 0 &&
      ![DataType.BOOL, DataType.STRING, DataType.DATE].includes(
        parameterdatatype,
      )
    ) {
      const firstValue = parameterdata[0];
      const lastValue = parameterdata[parameterdata.length - 1];
      const aggregatesampledata = {
        AVERAGE: valueRoundOff(mean(parameterdata)),
        MINIMUM: valueRoundOff(Number(min(parameterdata))),
        MAXIMUM: valueRoundOff(Number(max(parameterdata))),
        SUMMATION: valueRoundOff(sum(parameterdata)),
        DIFFERENCE: valueRoundOff(
          (typeof firstValue === 'number' && typeof lastValue === 'number') ||
            (typeof firstValue === 'bigint' && typeof lastValue === 'bigint')
            ? Number(lastValue) - Number(firstValue)
            : 0,
        ),
        FIRST: valueRoundOff(Number(firstValue)),
        LAST: valueRoundOff(Number(lastValue)),
      };

      switch (parameteraggregatetype) {
        case AggregateType.AVERAGE:
          return aggregatesampledata.AVERAGE;
        case AggregateType.MINIMUM:
          return aggregatesampledata.MINIMUM;
        case AggregateType.MAXIMUM:
          return aggregatesampledata.MAXIMUM;
        case AggregateType.SUMMATION:
          return aggregatesampledata.SUMMATION;
        case AggregateType.DIFFERENCE:
          return aggregatesampledata.DIFFERENCE;
        case AggregateType.FIRST:
          return aggregatesampledata.FIRST;
        case AggregateType.LAST:
          return aggregatesampledata.LAST;
        default:
          return aggregatesampledata.AVERAGE;
      }
    } else {
      if (parameterdatatype === DataType.BOOL) {
        return parameterdata?.[0] ?? false;
      } else if (parameterdatatype === DataType.STRING) {
        return parameterdata?.[0] ?? '';
      } else if (parameterdatatype === DataType.DATE) {
        return parameterdata?.[0] ?? new Date('2000-01-01');
      } else {
        return 0;
      }
    }
  };

  private sampleDataByDevice = (
    deviceid: string,
    devicesampledata: IArmaxViewDeviceRawDataSample[],
  ): [string, IParameterValueWithoutMeta] | null => {
    const device = this.devicesObject[deviceid];
    if (device) {
      const parameterresult = Object.fromEntries(
        device.parameters!.map((parameter) => {
          const parameterdata = devicesampledata
            .filter(
              (devicesample) =>
                devicesample.data[ApplicationParameter.IS_HEALTHY.value] &&
                devicesample.data[parameter.parametername] !== null &&
                devicesample.data[parameter.parametername] !== undefined,
            )
            .map((devicesample) => devicesample.data[parameter.parametername]);
          const sampledvalue = this.aggregateParameter(
            parameter.parameteraggregatetype,
            parameterdata,
            parameter.parameterdatatype,
          );
          return [parameter.parametername, sampledvalue];
        }),
      );

      const ishealthy = devicesampledata
        .map((data) => data.data[ApplicationParameter.IS_HEALTHY.value])
        .some((healthstatus) => healthstatus === true);
      return [
        deviceid,
        {
          parameters: {
            ...parameterresult,
            [ApplicationParameter.IS_HEALTHY.value]: ishealthy,
          },
        },
      ];
    }
    return null;
  };

  processDataAggregate = async () => {
    const devicesamplearraygroup =
      await this._deviceDataSamplerBusiness.getDeviceSampleData();

    const rawdataarray = devicesamplearraygroup.map(
      ({ _id: timestamp, data: timestampgroup }) => {
        const groupbydeviceid = groupBy(
          timestampgroup,
          (sampledata) => sampledata.deviceid,
        );

        const rawdatadevices = Object.fromEntries(
          Object.entries(groupbydeviceid)
            .map(([deviceid, deviceidbasedsampledatas]) => {
              return this.sampleDataByDevice(
                deviceid,
                deviceidbasedsampledatas,
              );
            })
            .filter((x) => x != null)
            .map(([key, value]: [string, IParameterValueWithoutMeta]) => [
              key,
              value,
            ]),
        );

        const rawdata: IArmaxViewDeviceRawData = {
          timestamp: timestamp,
          planttimestamp: getTime(
            addMinutes(
              startOfMinute(timestamp),
              this.plant.planttimezone?.utcOffset ?? 0,
            ),
          ),
          plantid: this.plant._id,
          readytodelete: false,
          data: {
            ...rawdatadevices,
          },
          datareceivedat: -1,
        };

        return rawdata;
      },
    );

    if (rawdataarray && rawdataarray.length) {
      const ids = devicesamplearraygroup
        .map(({ data }) =>
          data.map((d: IArmaxViewDeviceRawDataSample) => d._id),
        )
        .flat(2);
      await this._deviceRawDataBusiness.saveManyData(rawdataarray);
      await this._deviceDataSamplerBusiness.makeReadyToDelete(ids);
    }
  };
}
