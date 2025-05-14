import {
  MessageQueueService,
  ProtocolDataBusiness,
  ResponseBoolean,
  SaveDevicesData,
  SchemaValidationInterceptor,
} from '@library/av-ds-library';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProtocolDataValidation } from './protocoldata.validation';

@ApiTags('Protocol Data')
@Controller('device')
@ApiResponse({
  status: 404,
  description: 'Not found',
})
@ApiResponse({
  status: 500,
  description: 'Server error',
})
@ApiExtraModels(ResponseBoolean, SaveDevicesData)
export class ProtocolDataController {
  constructor(
    private readonly _protocolDataBusiness: ProtocolDataBusiness,
    private readonly _messageQueueService: MessageQueueService,
  ) {}

  @Put('data')
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseBoolean),
    },
  })
  @UseInterceptors(new SchemaValidationInterceptor(ProtocolDataValidation))
  @HttpCode(HttpStatus.OK)
  async saveData(
    @Body() { data, timestamp }: SaveDevicesData,
  ): Promise<ResponseBoolean> {
    this._messageQueueService.publishLatestData({ data, timestamp });
    const deviceMap = Object.values(data).map((_data) => ({
      ..._data,
      timestamp,
    }));

    const promiseMap = deviceMap.map((_device) =>
      this._protocolDataBusiness
        .saveDeviceLatestData(_device)
        .catch((e) => new Error(e)),
    );
    await Promise.all(promiseMap);
    return {
      data: true,
      error: false,
    };
  }
}
