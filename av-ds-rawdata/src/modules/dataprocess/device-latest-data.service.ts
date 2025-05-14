import {
  IArmaxViewDataScrapperDevice,
  IDeviceRawBaseDataSave,
  IDeviceRawDataSave,
  IParameterValueWithMeta,
  TParameterValue,
} from '@armax_cloud/av-models';
import {
  ApplicationParameter,
  DeviceType,
  IDeviceRawData,
} from '@armax_cloud/radiatics-models';
import {
  MessageQueueService,
  PPCDeviceBusiness,
  PlantBusiness,
  RedisDataService,
  RestApiService,
} from '@library/av-ds-library';
import { IDeviceDataDifference } from '@library/av-ds-library/models/INotificationRequestData';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { getTime, startOfSecond, subMinutes } from 'date-fns';
import { orderIndependentDiff } from 'deep-diff';
import { orderBy } from 'lodash';
import { ObjectId } from 'mongodb';
import { BLOCK_TRANSFER_STATUS } from '../../av-ds-rawdata.constants';
import { DsVersionService } from './ds-version.service';

@Injectable()
export class DeviceLatestDataService implements OnModuleInit {
  private devices: IArmaxViewDataScrapperDevice[] = [];

  private lastDeviceKeys: string[] = [];
  private currentDeviceKeys: string[] = [];
  private plantid: string | any;
  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _messageQueueService: MessageQueueService,
    private readonly _restApiService: RestApiService,
    private readonly _plantBusiness: PlantBusiness,
    private readonly _versionService: DsVersionService,
    private readonly _ppcDeviceBusiness: PPCDeviceBusiness,
  ) {}

  // preload all devices
  onModuleInit = async () => {
    const redisDeviceKeys =
      await this._redisDataService.getKeys('DEVICECONFIG-*');
    this.devices = (await this._redisDataService.getDataByKeys(redisDeviceKeys))
      .filter((device) => device !== null)
      .map((device: string) => JSON.parse(device));

    // redis keys
    this.lastDeviceKeys = this.devices
      .map((device) =>
        (device.deviceips || []).map(
          (deviceip) => `${device.deviceid}-${deviceip}-lastsent`,
        ),
      )
      .flat(2);
    this.currentDeviceKeys = this.devices
      .map((device) =>
        (device.deviceips || []).map(
          (deviceip) => `${device.deviceid}-${deviceip}-current`,
        ),
      )
      .flat(2);

    await this._redisDataService.setDataByKey(
      BLOCK_TRANSFER_STATUS,
      JSON.stringify(false),
    );
    const plant = await this._plantBusiness.getPlant();
    this.plantid = plant?.plantid;
  };

  private processDeviceDiffData = (
    device: IArmaxViewDataScrapperDevice,
    deviceip: string,
    dataTransferStatus: boolean,
    lastSentData: IDeviceRawDataSave | null,
    currentData: IDeviceRawDataSave | null,
  ) => {
    let hasdiffers = false;
    let isMasterChanged = false;
    let changedData: IParameterValueWithMeta = {
      parameters: {},
      parametersmeta: {},
    };

    const parameterDifference = orderIndependentDiff(
      lastSentData?.parameters ?? {},
      currentData?.parameters ?? {},
    );

    if (parameterDifference) {
      hasdiffers = true;
      parameterDifference
        ?.filter(
          (pd) =>
            pd.path &&
            pd.path.length > 0 &&
            (pd.kind === 'E' || pd.kind === 'N'),
        )
        .map((pd) => {
          const parametername = String(pd.path?.[0]);
          const parametervalue =
            pd.kind === 'N' || pd.kind === 'E'
              ? <TParameterValue>(<unknown>pd.rhs)
              : null;
          if (
            !isMasterChanged &&
            parametername === ApplicationParameter.IS_MASTER.value &&
            parametervalue
          ) {
            isMasterChanged = true;
          }

          changedData = {
            ...changedData,
            parameters: {
              ...changedData.parameters,
              [parametername]: parametervalue,
            },
            parametersmeta: {
              ...changedData.parametersmeta,
              ...(currentData?.parametersmeta?.[parametername]
                ? {
                    [parametername]: {
                      ...currentData?.parametersmeta?.[parametername],
                    },
                  }
                : {}),
            },
          };
        });
    }

    if (!dataTransferStatus || isMasterChanged) {
      hasdiffers = true;
      device.parameters?.map(({ parametername }) => {
        changedData = {
          ...changedData,
          parameters: {
            ...changedData.parameters,
            [parametername]: currentData?.parameters?.[parametername] ?? null,
          },
          parametersmeta: {
            ...changedData.parametersmeta,
            ...(currentData?.parametersmeta?.[parametername]
              ? {
                  [parametername]: {
                    ...currentData?.parametersmeta?.[parametername],
                  },
                }
              : {}),
          },
        };
      });
    }

    return {
      deviceid: device.deviceid,
      hasdiffers,
      deviceip,
      devicetypeid: device.devicetypeid,
      redundant: device.deviceips && device.deviceips.length > 1 ? true : false,
      currentData,
      changedData,
    };
  };

  // collect data by subscription
  collectDeviceLatestData = async () => {
    const timestamp = getTime(new Date());
    const resultsetdata: IDeviceRawBaseDataSave[] = [];
    const dataForNotification: IDeviceDataDifference[] = [];
    const pipline = this._redisDataService.getPipeline();
    // get blcok transfer current status
    const redisBlockTransferStatus =
      (
        await this._redisDataService.getDataByKey(BLOCK_TRANSFER_STATUS)
      )?.toLowerCase() == 'true';

    // get device lastsent and current data
    const redisLastData = Object.fromEntries(
      (await this._redisDataService.getDataByKeys(this.lastDeviceKeys))
        .filter((data) => data)
        .map((data: string) => {
          const devicedata: IDeviceRawDataSave = JSON.parse(data);
          return [`${devicedata.deviceid}-${devicedata.deviceip}`, devicedata];
        }),
    );

    const redisCurrentData = Object.fromEntries(
      (await this._redisDataService.getDataByKeys(this.currentDeviceKeys))
        .filter((data) => data)
        .map((data: string) => {
          const devicedata: IDeviceRawDataSave = JSON.parse(data);
          return [`${devicedata.deviceid}-${devicedata.deviceip}`, devicedata];
        }),
    );

    const devicenewdata = this.devices
      .map((device) =>
        (device.deviceips || []).map((deviceip) =>
          this.processDeviceDiffData(
            device,
            deviceip,
            redisBlockTransferStatus,
            redisLastData[`${device.deviceid}-${deviceip}`],
            redisCurrentData[`${device.deviceid}-${deviceip}`],
          ),
        ),
      )
      .flat(2);

    devicenewdata.forEach(
      ({
        deviceid,
        hasdiffers,
        deviceip,
        devicetypeid,
        redundant,
        currentData,
        changedData,
      }) => {
        if (hasdiffers) {
          pipline.set(
            `${deviceid}-${deviceip}-lastsent`,
            JSON.stringify(currentData),
          );

          resultsetdata.push({
            deviceid,
            deviceip,
            devicetypeid,
            ...changedData,
          });
        }

        if (
          changedData?.parameters &&
          Object.keys(changedData.parameters).length > 0
        ) {
          dataForNotification.push({
            ...changedData,
            deviceid,
            deviceip,
            redundant,
            ismaster:
              Boolean(
                currentData?.parameters[ApplicationParameter.IS_MASTER.value],
              ) ?? false,
          });
        }
      },
    );

    // send notification difference data
    if (dataForNotification.length) {
      this._messageQueueService.sendNotificationRequest(dataForNotification);
    }
    if (resultsetdata && resultsetdata.length) {
      this._restApiService
        .sendLatestDataToServer({
          timestamp,
          data: resultsetdata,
        })
        .then(async () => {
          pipline.set(BLOCK_TRANSFER_STATUS, JSON.stringify(true));
          await pipline.exec();
        })
        .catch(async () => {
          await this._redisDataService
            .setDataByKey(BLOCK_TRANSFER_STATUS, JSON.stringify(false))
            .catch();
        });
    }
    // since we except only one ppc device we are using find
    //  in case of multiple device switch to filter and map to construct relavent datatstructure

    const ppcdevicesdata = orderBy(
      devicenewdata.filter(
        (deviceData) => deviceData.devicetypeid === DeviceType.PPC,
      ),
      (data) => data.currentData?.timestamp,
      'desc',
    );

    let ppcdevicedata = null;
    if (
      ppcdevicesdata.find(
        (deviceData) =>
          !deviceData.redundant ||
          (deviceData.redundant &&
            deviceData.currentData?.parameters?.[
              ApplicationParameter.IS_HEALTHY.value
            ] &&
            deviceData.currentData?.parameters?.[
              ApplicationParameter.IS_MASTER.value
            ]),
      )
    ) {
      ppcdevicedata = ppcdevicesdata.find(
        (deviceData) =>
          !deviceData.redundant ||
          (deviceData.redundant &&
            deviceData.currentData?.parameters?.[
              ApplicationParameter.IS_HEALTHY.value
            ] &&
            deviceData.currentData?.parameters?.[
              ApplicationParameter.IS_MASTER.value
            ]),
      );
    } else if (
      ppcdevicesdata.find(
        (deviceData) =>
          !deviceData.redundant ||
          (deviceData.redundant &&
            deviceData.currentData?.parameters?.[
              ApplicationParameter.IS_HEALTHY.value
            ]),
      )
    ) {
      ppcdevicedata = ppcdevicesdata.find(
        (deviceData) =>
          deviceData.devicetypeid === DeviceType.PPC &&
          (!deviceData.redundant ||
            (deviceData.redundant &&
              deviceData.currentData?.parameters?.[
                ApplicationParameter.IS_HEALTHY.value
              ])),
      );
    } else {
      ppcdevicedata = ppcdevicesdata?.[0];
    }

    if (ppcdevicedata) {
      //check for master and ppc device makr ready to delete false
      const latestVersion = await this._versionService.getLatestversion();
      const _planttimezone =
        await this._plantBusiness.getPlantTimezone(latestVersion);
      const current_timestamp = startOfSecond(timestamp);
      const planttimestamp = subMinutes(current_timestamp, _planttimezone);

      const ppcDeviceData: IDeviceRawData = {
        data: {
          [ppcdevicedata.deviceid.toString()]: {
            parameters: { ...ppcdevicedata?.currentData?.parameters },
          },
        },
        timestamp: getTime(current_timestamp),
        planttimestamp: getTime(planttimestamp),
        datareceivedat: -1,
        plantid: this.plantid,
        readytodelete: false,
      };

      const result = await this._restApiService
        .sendPPCDeviceRawData([{ ...ppcDeviceData, _id: new ObjectId() }])
        .catch((error) => new Error(error));

      await this._ppcDeviceBusiness.updatePPCDeviceData({
        ...ppcDeviceData,
        readytodelete: !(result instanceof Error),
      });
    }
  };
}
