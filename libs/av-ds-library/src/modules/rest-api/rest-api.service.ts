import {
  IArmaxViewAlert,
  IArmaxViewEvent,
  IDeviceLatestDataSet,
} from '@armax_cloud/av-models';
import { IDeviceRawData, PROTOCOL } from '@armax_cloud/radiatics-models';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Config } from '../../app.config';
import {
  DeviceOperationWriteRequest,
  ResponseBoolean,
  SaveDevicesData,
} from '../../models';
import { generateToken } from '../../services';

@Injectable()
export class RestApiService {
  rawdatatokenexpiretime = 5 * 1000;
  constructor(private readonly _httpService: HttpService) {}

  sendDeviceDataToCron = async (devicedata: SaveDevicesData) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `http://${Config.blockip}:${Config.applicationports.cronport}/device/data`,
        devicedata,
      ),
    );
  };

  sendWriteCommand = (
    deviceid: string,
    protocolid: PROTOCOL,
    payload: DeviceOperationWriteRequest,
  ) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `http://${Config.blockip}:${Config.applicationports.cronport}/device/${deviceid}/${protocolid}/write`,
        payload,
      ),
    );
  };

  sendLatestDataToServer = (devicelatestdata: IDeviceLatestDataSet) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `${Config.dataprocessendpoint.url}/device/data/latest`,
        devicelatestdata,
        {
          headers: {
            Authorization: `Bearer ${generateToken(
              {},
              Config.dataprocessendpoint.jwtsecret,
              this.rawdatatokenexpiretime,
            )}`,
          },
        },
      ),
    );
  };

  sendDeviceRawData = (devicerawdata: Array<IDeviceRawData>) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `${Config.dataprocessendpoint.url}/device/data/history/raw`,
        devicerawdata,
        {
          headers: {
            Authorization: `Bearer ${generateToken(
              {},
              Config.dataprocessendpoint.jwtsecret,
              this.rawdatatokenexpiretime,
            )}`,
          },
        },
      ),
    );
  };

  sendPPCDeviceRawData = (ppcdevicerawdata: Array<IDeviceRawData>) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `${Config.dataprocessendpoint.url}/device/data/history/ppc`,
        ppcdevicerawdata,
        {
          headers: {
            Authorization: `Bearer ${generateToken(
              {},
              Config.dataprocessendpoint.jwtsecret,
              this.rawdatatokenexpiretime,
            )}`,
          },
        },
      ),
    );
  };

  sendDeviceAlerts = (alerts: Array<IArmaxViewAlert>) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `${Config.dataprocessendpoint.url}/alerts`,
        alerts,
        {
          headers: {
            Authorization: `Bearer ${generateToken(
              {},
              Config.dataprocessendpoint.jwtsecret,
              this.rawdatatokenexpiretime,
            )}`,
          },
        },
      ),
    );
  };

  sendDeviceEvents = (events: Array<IArmaxViewEvent>) => {
    return firstValueFrom(
      this._httpService.put<ResponseBoolean>(
        `${Config.dataprocessendpoint.url}/events`,
        events,
        {
          headers: {
            Authorization: `Bearer ${generateToken(
              {},
              Config.dataprocessendpoint.jwtsecret,
              this.rawdatatokenexpiretime,
            )}`,
          },
        },
      ),
    );
  };
}
