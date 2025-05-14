import {
  IArmaxViewDataScrapperBlock,
  IArmaxViewDataScrapperDevice,
  IArmaxViewDataScrapperPlant,
  IArmaxViewNotification,
  IArmaxViewParameter,
  PPCApplicationParameter,
  TParameterValue,
} from '@armax_cloud/av-models';
import {
  ApplicationParameter,
  DataType,
  NotificationType,
} from '@armax_cloud/radiatics-models';
import {
  Config,
  IArmaxViewDataScrapperAlertWithFlag,
  IArmaxViewDataScrapperEventWithFlag,
  IDeviceDataDifference,
  RedisDataService,
  RestApiService,
  dataComparison,
} from '@library/av-ds-library';
import { AlertBusiness } from '@library/av-ds-library/business/alert.business';
import { EventBusiness } from '@library/av-ds-library/business/event.business';
import { Injectable } from '@nestjs/common';
import { addMinutes, getTime } from 'date-fns';
import { ObjectId } from 'mongodb';

@Injectable()
export class NotificationProcessBusiness {
  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _alertBusiness: AlertBusiness,
    private readonly _eventBusiness: EventBusiness,
    private readonly _restApiService: RestApiService,
  ) {}

  private getNotificationStatus = (
    parameter: IArmaxViewParameter,
    notification: IArmaxViewNotification,
    parametervalue: TParameterValue,
  ) => {
    if (
      notification.notificationconvert &&
      notification.notificationbitposition !== undefined &&
      notification.notificationbitposition >= 0
    ) {
      const bitArray = parseInt(parametervalue!.toString())
        .toString(2)
        .padStart(64, '0')
        .split('')
        .reverse()
        .map((x) => x === '1');
      const valueAtBitPossition =
        bitArray[notification.notificationbitposition ?? 0];
      return dataComparison(
        valueAtBitPossition,
        notification.notificationvalue,
        notification.notificationcomparisiontype,
        DataType.BOOL,
      );
    } else if (!notification.notificationconvert) {
      return dataComparison(
        parametervalue,
        notification.notificationvalue,
        notification.notificationcomparisiontype,
        parameter.parameterdatatype,
      );
    } else {
      throw new Error('Invalid data to calculate notification status');
    }
  };
  private processAlert = async (
    plant: IArmaxViewDataScrapperPlant,
    block: IArmaxViewDataScrapperBlock,
    device: IArmaxViewDataScrapperDevice,
    parameter: IArmaxViewParameter,
    devicedata: IDeviceDataDifference,
    parametervalue: TParameterValue,
    notification: IArmaxViewNotification,
    notificationtime: number,
  ) => {
    const isinternal =
      devicedata.redundant &&
      !devicedata.ismaster &&
      parameter.parametername !== ApplicationParameter.IS_MASTER.value &&
      parameter.parametername !== PPCApplicationParameter.PLC1_PRIMARY.value &&
      parameter.parametername !== PPCApplicationParameter.PLC2_PRIMARY.value;

    let currentAlert: IArmaxViewDataScrapperAlertWithFlag = {
      referenceid: new ObjectId().toString(),
      plantid: new ObjectId(plant.plantid),
      blockid: new ObjectId(device.blockid),
      deviceid: new ObjectId(device.deviceid),
      devicetypeid: device.devicetypeid,
      blockdisplayname: block.blockdisplayname,
      devicedisplayname: device.devicedisplayname,
      notificationid: new ObjectId(notification._id),
      alertid: new ObjectId(notification._id),
      alertdescription: notification.notificationdisplayname,
      alertseverity: notification.notificationseverity,
      alertstatus: this.getNotificationStatus(
        parameter,
        notification,
        parametervalue,
      ),
      alertstartdatetime: notificationtime,
      alertplantstartdatetime: getTime(
        addMinutes(notificationtime, plant.planttimezone?.utcOffset ?? 0),
      ),
      statusonsent: isinternal ? true : false,
      statusoffsent: false,
      isalert: true,
      isinternal: false,
    };

    const rediskey = `${Config.subdomain}-block-notification-${device.deviceid}-${notification._id}-${devicedata.deviceip}`;
    let redisNotification: IArmaxViewDataScrapperAlertWithFlag | null;

    const redisNotificationstring =
      await this._redisDataService.getDataByKey(rediskey);

    if (redisNotificationstring) {
      redisNotification = JSON.parse(redisNotificationstring);
    } else {
      redisNotification =
        await this._alertBusiness.getLastAlertByNotificationId(
          currentAlert.notificationid,
        );

      if (redisNotification) {
        await this._redisDataService.setDataByKey(
          rediskey,
          JSON.stringify({
            ...redisNotification,
            isalert: true,
            isinternal: false,
          }),
        );
      }
    }

    if (!currentAlert.alertstatus && redisNotification) {
      currentAlert = {
        ...currentAlert,
        alertstartdatetime: redisNotification.alertstartdatetime,
        alertplantstartdatetime: redisNotification.alertplantstartdatetime,

        alertenddatetime: getTime(new Date(notificationtime)),
        alertplantenddatetime: getTime(
          addMinutes(notificationtime, plant.planttimezone?.utcOffset ?? 0),
        ),
        statusonsent: !!redisNotification!.statusonsent,
        statusoffsent: isinternal ? true : false,
        referenceid: new ObjectId(redisNotification.referenceid).toString(),
      };
    }

    if (currentAlert.alertstatus !== redisNotification?.alertstatus) {
      currentAlert.isinternal =
        devicedata.redundant &&
        !devicedata.ismaster &&
        parameter.parametername !== ApplicationParameter.IS_MASTER.value &&
        parameter.parametername !==
          PPCApplicationParameter.PLC1_PRIMARY.value &&
        parameter.parametername !== PPCApplicationParameter.PLC2_PRIMARY.value;

      await this._redisDataService.setDataByKey(
        rediskey,
        JSON.stringify(currentAlert),
      );
      return currentAlert;
    }
    return null;
  };

  private processEvent = async (
    plant: IArmaxViewDataScrapperPlant,
    block: IArmaxViewDataScrapperBlock,
    device: IArmaxViewDataScrapperDevice,
    parameter: IArmaxViewParameter,
    devicedata: IDeviceDataDifference,
    parametervalue: TParameterValue,
    notification: IArmaxViewNotification,
    notificationtime: number,
  ) => {
    const isinternal =
      devicedata.redundant &&
      !devicedata.ismaster &&
      parameter.parametername !== ApplicationParameter.IS_MASTER.value &&
      parameter.parametername !== PPCApplicationParameter.PLC1_PRIMARY.value &&
      parameter.parametername !== PPCApplicationParameter.PLC2_PRIMARY.value;
    const currentEvent: IArmaxViewDataScrapperEventWithFlag = {
      referenceid: new ObjectId().toString(),
      plantid: new ObjectId(plant.plantid),
      blockid: new ObjectId(device.blockid),
      deviceid: new ObjectId(device.deviceid),
      devicetypeid: device.devicetypeid,
      blockdisplayname: block.blockdisplayname,
      devicedisplayname: device.devicedisplayname,
      notificationid: new ObjectId(notification._id),
      eventid: new ObjectId(notification._id),
      eventdescription: notification.notificationdisplayname,
      eventseverity: notification.notificationseverity,
      eventstatus: this.getNotificationStatus(
        parameter,
        notification,
        parametervalue,
      ),
      eventdatetime: notificationtime,
      eventplantdatetime: getTime(
        addMinutes(notificationtime, plant.planttimezone?.utcOffset ?? 0),
      ),
      statusonsent: false,
      isevent: true,
      isinternal: false,
    };

    const rediskey = `${Config.subdomain}-block-notification-${device.deviceid}-${notification._id}-${devicedata.deviceip}`;
    let redisNotification: IArmaxViewDataScrapperEventWithFlag | null;

    const redisNotificationstring =
      await this._redisDataService.getDataByKey(rediskey);

    if (redisNotificationstring) {
      redisNotification = JSON.parse(redisNotificationstring);
    } else {
      redisNotification =
        await this._eventBusiness.getLastEventByNotificationId(
          currentEvent.notificationid,
        );

      if (redisNotification) {
        await this._redisDataService.setDataByKey(
          rediskey,
          JSON.stringify({
            ...redisNotification,
            isalert: true,
            isinternal: false,
          }),
        );
      }
    }

    if (currentEvent.eventstatus !== redisNotification?.eventstatus) {
      currentEvent.isinternal = !currentEvent.eventstatus && isinternal;
      currentEvent.statusonsent =
        !currentEvent.eventstatus && isinternal ? true : false;
      await this._redisDataService.setDataByKey(
        rediskey,
        JSON.stringify(currentEvent),
      );
      return currentEvent;
    }
    return null;
  };

  private processNotification = async (
    plant: IArmaxViewDataScrapperPlant,
    block: IArmaxViewDataScrapperBlock,
    device: IArmaxViewDataScrapperDevice,
    parameter: IArmaxViewParameter,
    devicedata: IDeviceDataDifference,
    parametervalue: TParameterValue,
    notification: IArmaxViewNotification,
    notificationtime: number,
  ) => {
    if (notification.notificationtype == NotificationType.ALERT) {
      return this.processAlert(
        plant,
        block,
        device,
        parameter,
        devicedata,
        parametervalue,
        notification,
        notificationtime,
      );
    } else if (notification.notificationtype == NotificationType.EVENT) {
      return this.processEvent(
        plant,
        block,
        device,
        parameter,
        devicedata,
        parametervalue,
        notification,
        notificationtime,
      );
    } else {
      return null;
    }
  };

  private processParameterNotification = async (
    plant: IArmaxViewDataScrapperPlant,
    block: IArmaxViewDataScrapperBlock,
    device: IArmaxViewDataScrapperDevice,
    parameter: IArmaxViewParameter,
    devicedata: IDeviceDataDifference,
    parametervalue: TParameterValue,
    notificationtime: number,
  ) => {
    if (
      !parameter.notifications?.length ||
      parametervalue === null ||
      parametervalue === undefined
    ) {
      return [];
    }

    const notificationPromiseMap = parameter.notifications.map((notification) =>
      this.processNotification(
        plant,
        block,
        device,
        parameter,
        devicedata,
        parametervalue,
        notification,
        notificationtime,
      ).catch((error) => new Error(error)),
    );

    const notificationPromiseResult = await Promise.all(notificationPromiseMap);
    return notificationPromiseResult.filter(
      (x) => x !== null && !(x instanceof Error),
    );
  };

  private processDeviceNotification = async (
    plant: IArmaxViewDataScrapperPlant,
    block: IArmaxViewDataScrapperBlock,
    device: IArmaxViewDataScrapperDevice,
    devicedata: IDeviceDataDifference,
  ) => {
    const parameterObject = Object.fromEntries(
      device.parameters!.map((parameer) => [parameer.parametername, parameer]),
    );

    const parameterNotificationPromiseMap = Object.entries(
      devicedata.parameters,
    ).map(([parametername, parametervalue]) =>
      this.processParameterNotification(
        plant,
        block,
        device,
        parameterObject[parametername],
        devicedata,
        parametervalue,
        devicedata.parametersmeta?.[parametername].timestamp ??
          getTime(new Date()),
      ).catch((error) => new Error(error)),
    );

    const parameterNotificationPromiseResult = await Promise.all(
      parameterNotificationPromiseMap,
    );
    return parameterNotificationPromiseResult
      .filter(
        (notificationResult) =>
          notificationResult !== null && !(notificationResult instanceof Error),
      )
      .flat(1);
  };

  processNotificationPayload = async (devicedata: IDeviceDataDifference[]) => {
    const deviceids = devicedata.map(
      (tempdevicedata) => tempdevicedata.deviceid,
    );

    const plant: IArmaxViewDataScrapperPlant =
      await this._redisDataService.getPlant();

    const blockRedisKeys =
      await this._redisDataService.getKeys('BLOCKCONFIG-*');
    const blocksConfig: IArmaxViewDataScrapperBlock[] = (
      await this._redisDataService.getDataByKeys(blockRedisKeys)
    ).map((tempdevicedata: string) => JSON.parse(tempdevicedata));
    const blockConfigObject: {
      [blockid: string]: IArmaxViewDataScrapperBlock;
    } = Object.fromEntries(blocksConfig.map((block) => [block.blockid, block]));

    const deviceRedisKeys = deviceids.map(
      (deviceid) => `DEVICECONFIG-${deviceid}`,
    );
    const devicesConfig: IArmaxViewDataScrapperDevice[] = (
      await this._redisDataService.getDataByKeys(deviceRedisKeys)
    ).map((tempdevicedata: string) => JSON.parse(tempdevicedata));

    const deviceConfigObject: {
      [deviceid: string]: IArmaxViewDataScrapperDevice;
    } = Object.fromEntries(
      devicesConfig.map((device) => [device.deviceid, device]),
    );

    const deviceNotificationPromiseMap = devicedata.map((tempdevicedata) =>
      this.processDeviceNotification(
        plant,
        blockConfigObject[deviceConfigObject[tempdevicedata.deviceid].blockid],
        deviceConfigObject[tempdevicedata.deviceid],
        tempdevicedata,
      ).catch((error) => new Error(error)),
    );

    const deviceNotificationPromiseResult = await Promise.all(
      deviceNotificationPromiseMap,
    );
    const deviceNotificationPromiseResultNonError =
      deviceNotificationPromiseResult
        .filter((x) => !(x instanceof Error))
        .flat(1) as (
        | IArmaxViewDataScrapperAlertWithFlag
        | IArmaxViewDataScrapperEventWithFlag
      )[];

    const alertsToProcess = deviceNotificationPromiseResultNonError.filter(
      (notificationResult) => notificationResult && notificationResult.isalert,
    ) as IArmaxViewDataScrapperAlertWithFlag[];

    const eventsToProcess = deviceNotificationPromiseResultNonError.filter(
      (notificationResult) => notificationResult && notificationResult.isevent,
    ) as IArmaxViewDataScrapperEventWithFlag[];

    const internalAlerts = alertsToProcess.filter((alert) => alert.isinternal);
    const alerts = alertsToProcess.filter((alert) => !alert.isinternal);

    if (alerts && alerts.length) {
      this._restApiService
        .sendDeviceAlerts(alerts)
        .then(async () => {
          const updatedAlerts = alerts.map((alert) => ({
            ...alert,
            ...(alert.alertstatus
              ? { statusonsent: true }
              : { statusonsent: true, statusoffsent: true }),
          }));
          await this._alertBusiness.saveAlerts(updatedAlerts);
        })
        .catch(async () => {
          await this._alertBusiness.saveAlerts(alerts);
        });
    }

    if (internalAlerts && internalAlerts.length) {
      await this._alertBusiness.saveAlerts(internalAlerts);
    }

    const internalEvents = eventsToProcess.filter((alert) => alert.isinternal);
    const events = eventsToProcess.filter((alert) => !alert.isinternal);
    if (events && events.length) {
      this._restApiService
        .sendDeviceEvents(events)
        .then(async () => {
          const updatedEvents = events.map((event) => ({
            ...event,
            statusonsent: true,
          }));
          await this._eventBusiness.saveEvents(updatedEvents);
        })
        .catch(async () => {
          await this._eventBusiness.saveEvents(events);
        });
    }

    if (internalEvents && internalEvents.length) {
      await this._eventBusiness.saveEvents(internalEvents);
    }
  };

  initNotificationsintoRedis = async () => {
    const allDevicesKeys =
      await this._redisDataService.getKeys('DEVICECONFIG-*');
    const allDevices = (
      await this._redisDataService.getDataByKeys(allDevicesKeys)
    ).map(
      (devicestring: string) =>
        <IArmaxViewDataScrapperDevice>JSON.parse(devicestring),
    );

    if (allDevices.length) {
      const pipline = this._redisDataService.getPipeline();
      const deviceObject: { [deviceid: string]: IArmaxViewDataScrapperDevice } =
        Object.fromEntries(
          allDevices.map((device) => [device.deviceid, device]),
        );

      const notificationIds = allDevices
        .map((device) =>
          device.parameters!.map((parameter) =>
            parameter.notifications.map((notification) => ({
              id: <string>notification._id.toString(),
              notificationtype: notification.notificationtype,
            })),
          ),
        )
        .flat(2)
        .filter((x) => x !== null && x != undefined);
      const notificationAlertMap = notificationIds
        .filter(
          (notification) =>
            notification.notificationtype === NotificationType.ALERT,
        )
        .map((notification) =>
          this._alertBusiness
            .getLastAlertByNotificationId(notification.id)
            .catch((error) => new Error(error)),
        );

      const notificationAlertResult = await Promise.all(notificationAlertMap);

      notificationAlertResult.forEach((alert) => {
        if (alert !== null && !(alert instanceof Error)) {
          const device = deviceObject[alert.deviceid];
          device.deviceips?.forEach((deviceip) => {
            pipline.set(
              `${Config.subdomain}-block-notification-${alert.deviceid}-${alert.notificationid}-${deviceip}`,
              JSON.stringify({
                ...alert,
                isalert: true,
              }),
            );
          });
        }
      });

      const notificationEventMap = notificationIds
        .filter(
          (notification) =>
            notification.notificationtype === NotificationType.EVENT,
        )
        .map((notification) =>
          this._alertBusiness
            .getLastAlertByNotificationId(notification.id)
            .catch((error) => new Error(error)),
        );

      const notificationEventResult = await Promise.all(notificationEventMap);
      notificationEventResult.forEach((event) => {
        if (event !== null && !(event instanceof Error)) {
          const device = deviceObject[event.deviceid];
          device.deviceips?.forEach((deviceip) => {
            pipline.set(
              `${Config.subdomain}-block-notification-${event.deviceid}-${event.notificationid}-${deviceip}`,
              JSON.stringify({
                ...event,
                isevent: true,
              }),
            );
          });
        }
      });

      await pipline.exec();
    }
  };
}
