import { ApplicationParameter, PROTOCOL } from '@armax_cloud/radiatics-models';

import { IArmaxViewDataScrapperDevice } from '@armax_cloud/av-models';
import {
  DeviceOperationWriteRequest,
  DeviceRawDataSave,
  FunctionBuilder,
  MessageQueueService,
  ProtocolWriteModbusRequest,
  ProtocolWriteOpcUARequest,
  ProtocolWriteSnmpRequest,
  RedisDataService,
  RedisModule,
  ResponseString,
  SchemaValidationInterceptor,
  ValidationException,
} from '@library/av-ds-library';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { DeviceOperationValidation } from './device-operation.validator';
import lodash from 'lodash';
@ApiTags('Device Operation')
@Controller('device')
@ApiResponse({
  status: 404,
  description: 'Not found',
})
@ApiResponse({
  status: 500,
  description: 'Server error',
})
@ApiExtraModels(ResponseString)
export class DeviceOperationController {
  // private readonly _logger = new Logger(DeviceOperationController.name);
  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _messageQueueService: MessageQueueService,
  ) {}

  @Put('/:deviceid/:protocolid/write')
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseString),
    },
  })
  @ApiParam({ name: 'deviceid', required: true, type: String })
  @ApiParam({
    name: 'protocolid',
    required: true,
    type: String,
    enum: [PROTOCOL.MODBUS, PROTOCOL.OPCUA],
  })
  @UseInterceptors(new SchemaValidationInterceptor(DeviceOperationValidation))
  @HttpCode(HttpStatus.OK)
  async sendWriteCommand(
    @Param('deviceid') deviceid: string,
    @Body() payload: DeviceOperationWriteRequest,
  ): Promise<ResponseString> {
    const deviceInstanceString = await this._redisDataService.getDataByKey(
      `INSTANCE-${deviceid}`,
    );

    if (!deviceInstanceString) {
      throw new ValidationException('Invalid Instance.');
    }

    const deviceInstance: {
      protocolname: string;
      instanceid: number;
      protocol: PROTOCOL;
    } = JSON.parse(deviceInstanceString);

    const deviceConfigString = await this._redisDataService.getDataByKey(
      `DEVICECONFIG-${deviceid}`,
    );

    if (!deviceConfigString) {
      throw new ValidationException('Device not Found.');
    }

    const deviceConfig: IArmaxViewDataScrapperDevice =
      JSON.parse(deviceConfigString);

    if (!deviceConfig.deviceips || !deviceConfig.deviceips.length) {
      throw new ValidationException(
        'Device IPs are not configured,Either virtual device or invalid configuration',
      );
    }

    let deviceip: string | null = null;
    let parameterCurrentValues = {};
    const plantConfig = JSON.parse(
      (await this._redisDataService.getDataByKey('PLANTCONFIG')) as string,
    );

    const isRedundant = deviceConfig.deviceips
      ? deviceConfig.deviceips.length > 1
      : false;

    const deviceips = deviceConfig.deviceips ? deviceConfig.deviceips : [];

    if (!isRedundant) {
      [deviceip] = deviceConfig.deviceips;
    } else {
      const rediskeys = deviceips.map(
        (deviceip) => `${deviceConfig.deviceid}-${deviceip}-current`,
      );

      const redisData = (await this._redisDataService.getDataByKeys(rediskeys))
        .filter((device) => device != null)
        .map((device: string) => <DeviceRawDataSave>JSON.parse(device));

      const masterDevice = redisData.find(
        (data) =>
          data.parameters[ApplicationParameter.IS_HEALTHY.value] &&
          data.parameters[ApplicationParameter.IS_MASTER.value],
      );

      if (masterDevice) {
        deviceip = masterDevice.deviceip;
        parameterCurrentValues = masterDevice;
      }
    }

    const writeprecheck = payload.prerunfunction
      ? await FunctionBuilder(
          null,
          { lodash },
          { RedisModule },
          { ...parameterCurrentValues },
          payload.prerunfunction,
          { ...plantConfig!.plantmeta },
        )
      : false;

    if (!writeprecheck) {
      throw new ValidationException('Write prechecks failed!');
    }

    if (!deviceip) {
      throw new Error('Device Not available');
    }

    let inputdata:
      | ProtocolWriteModbusRequest
      | ProtocolWriteOpcUARequest
      | ProtocolWriteSnmpRequest
      | null = null;

    if (deviceInstance.protocol == PROTOCOL.MODBUS && payload.modbusmeta) {
      inputdata = <ProtocolWriteModbusRequest>{
        deviceid,
        deviceip,
        deviceport: deviceConfig.deviceport || 502,
        modbusmeta: deviceConfig.devicemeta?.modbus,
        ...payload.modbusmeta,
      };
    } else if (deviceInstance.protocol == PROTOCOL.OPCUA && payload.opcuameta) {
      inputdata = <ProtocolWriteOpcUARequest>{
        deviceid,
        deviceip,
        deviceport: deviceConfig.deviceport || 502,
        endpoint: deviceConfig.devicemeta?.opcua?.endpoint,
        opcuameta: deviceConfig.devicemeta?.opcua,
        ...payload.opcuameta,
      };
    } else if (deviceInstance.protocol == PROTOCOL.SNMP && payload.snmpmeta) {
      inputdata = <ProtocolWriteSnmpRequest>{
        deviceid,
        deviceip,
        deviceport: deviceConfig.deviceport || 161,
        ...payload.snmpmeta,
      };
    }

    if (!inputdata) {
      throw new Error('Invalid Information');
    }

    this._messageQueueService.sendProtocolWriteRequest(
      deviceInstance.protocol,
      deviceInstance.instanceid,
      inputdata,
    );

    return {
      data: 'Command initiated',
      error: false,
    };
  }
}
