import {
  IArmaxViewCommunication,
  IArmaxViewDataScrapperDevice,
  IDeviceRawBaseDataSave,
} from '@armax_cloud/av-models';
import { ApplicationParameter } from '@armax_cloud/radiatics-models';
import {
  Config,
  DeviceRawDataSave,
  RedisDataService,
} from '@library/av-ds-library';
import { ResponseCommunication } from '@library/av-ds-library';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { getTime } from 'date-fns';
import { uniqBy } from 'lodash';

@ApiTags('Communication')
@Controller('communication')
@ApiResponse({
  status: 404,
  description: 'Not found',
})
@ApiResponse({
  status: 500,
  description: 'Server error',
})
@ApiExtraModels(ResponseCommunication)
export class CommunicationController {
  constructor(private readonly _redisDataService: RedisDataService) {}
  @Get()
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseCommunication),
    },
  })
  async getCommunicationStatus(): Promise<ResponseCommunication> {
    const deviceconfigstring =
      await this._redisDataService.getKeys('DEVICECONFIG-*');

    const deviceconfig = (
      await this._redisDataService.getDataByKeys(deviceconfigstring)
    ).map(
      (devicestring: string) =>
        <IArmaxViewDataScrapperDevice>JSON.parse(devicestring),
    );

    const rediskeys = deviceconfig
      .map((device) =>
        device.deviceips!.map(
          (deviceip) => `${device.deviceid}-${deviceip}-current`,
        ),
      )
      .flat(1);

    const redisData = (await this._redisDataService.getDataByKeys(rediskeys))
      .filter((device) => device != null)
      .map((device: string) => <DeviceRawDataSave>JSON.parse(device));

    const blocks = uniqBy(deviceconfig, (device) => device.blockid).map(
      (device) => device.blockid,
    );
    const resultsetdata: IDeviceRawBaseDataSave[] = redisData.map(
      (devicedata) => ({
        deviceid: devicedata.deviceid,
        deviceip: devicedata.deviceip,
        devicetypeid: devicedata.devicetypeid,
        parameters: {
          [ApplicationParameter.IS_HEALTHY.value]:
            devicedata.parameters[ApplicationParameter.IS_HEALTHY.value],
        },
        parametersmeta: {
          [ApplicationParameter.IS_HEALTHY.value]: devicedata?.parametersmeta?.[
            ApplicationParameter.IS_HEALTHY.value
          ] ?? { timestamp: getTime(new Date()), quality: true },
        },
      }),
    );

    const payload: IArmaxViewCommunication = {
      blocks: blocks.map((blockid) => ({
        blockid,
        blockip: Config.blockip,
        status: true,
      })),
      devices: resultsetdata,
    };

    return {
      data: payload,
      error: false,
    };
  }
}
