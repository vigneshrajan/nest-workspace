import { IArmaxViewEvent } from '@armax_cloud/av-models';
import { IDeviceRawData } from '@armax_cloud/radiatics-models';
import {
  AlertBusiness,
  DeviceRawDataBusiness,
  EventBusiness,
  IArmaxViewDataScrapperAlert,
  PPCDeviceBusiness,
  RestApiService,
} from '@library/av-ds-library';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AvDsBackLogService {
  private readonly _logger = new Logger(AvDsBackLogService.name);

  constructor(
    private readonly _restApiService: RestApiService,
    private readonly _ppcDeviceBusiness: PPCDeviceBusiness,
    private readonly _deviceRawDataBusiness: DeviceRawDataBusiness,
    private readonly _alertBusiness: AlertBusiness,
    private readonly _eventBusiness: EventBusiness,
  ) {}

  sendPPCDeviceRawData = async (ppcRecords: Array<IDeviceRawData>) => {
    try {
      await this._restApiService.sendPPCDeviceRawData(ppcRecords);
      await this._ppcDeviceBusiness.updateSentPPCRecords(
        ppcRecords.map((data) => data._id),
      );
    } catch (error) {
      this._logger.error(error);
    }
  };

  sendDeviceRawData = async (rawdata: Array<IDeviceRawData>) => {
    try {
      await this._restApiService.sendDeviceRawData(rawdata);
      this._deviceRawDataBusiness.makeReadyToDelete(
        rawdata.map((data) => data._id),
      );
    } catch (error) {
      this._logger.error(error);
    }
  };

  sendDeviceNotificationAlerts = async () => {
    try {
      const notificationRecords: Array<IArmaxViewDataScrapperAlert> =
        await this._alertBusiness.getPendingNotifications(10);

      if (notificationRecords.length > 0) {
        await this._restApiService.sendDeviceAlerts(notificationRecords);
        await this._alertBusiness.updateAlertSentStatus(notificationRecords);
      }
    } catch (error) {
      this._logger.error(error);
    }
  };

  sendDeviceNotificationEvents = async () => {
    try {
      const notificationRecords: Array<IArmaxViewEvent> =
        await this._eventBusiness.getPendingNotifications(50);

      if (notificationRecords.length > 0) {
        await this._restApiService.sendDeviceEvents(notificationRecords);
        await this._eventBusiness.updateStatusOnSent(
          notificationRecords.map((event) => event._id),
        );
      }
    } catch (error) {
      this._logger.error(error);
    }
  };
}
