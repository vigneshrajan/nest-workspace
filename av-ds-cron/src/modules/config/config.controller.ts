import { IAudit } from '@armax_cloud/radiatics-models';

import {
  IArmaxViewDataScrapperBlock,
  IArmaxViewDataScrapperDevice,
  IArmaxViewDataScrapperPlant,
} from '@armax_cloud/av-models';

import {
  DataScrapperVersionBusiness,
  DeviceBusiness,
  PlantBusiness,
} from '@library/av-ds-library/business';
import { BlockBusiness } from '@library/av-ds-library/business/block.business';
import { SchemaValidationInterceptor } from '@library/av-ds-library/interceptors';
import {
  ConfigRequest,
  ResponseString,
  ValidationException,
} from '@library/av-ds-library/models';
import {
  MessageQueueService,
  RedisDataService,
} from '@library/av-ds-library/modules';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { getTime } from 'date-fns';
import { Request } from 'express';
import { getClientIp } from 'request-ip';
import { ConfigUtil } from './config.util';
import { ConfigValidation } from './config.validation';

@ApiTags('Config')
@Controller('config')
@ApiResponse({
  status: 404,
  description: 'Not found',
})
@ApiResponse({
  status: 500,
  description: 'Server error',
})
@ApiExtraModels(ResponseString, ConfigRequest)
export class ConfigController {
  private readonly _logger = new Logger(ConfigController.name);
  private readonly _configUtil = new ConfigUtil();
  constructor(
    private readonly _devicebusiness: DeviceBusiness,
    private readonly _plantBusiness: PlantBusiness,
    private readonly _blockBusiness: BlockBusiness,
    private readonly _redisDataService: RedisDataService,
    private readonly _versionBusiness: DataScrapperVersionBusiness,
    private readonly _messageQueueService: MessageQueueService,
  ) {}

  @Put()
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseString),
    },
  })
  @UseInterceptors(new SchemaValidationInterceptor(ConfigValidation))
  @HttpCode(HttpStatus.OK)
  async saveConfig(
    @Body() payload: ConfigRequest,
    @Req() request: Request,
  ): Promise<ResponseString> {
    const audit: IAudit = {
      userid: '654927e6d3fbbfe7131224e9',
      username: 'abc',
      useremail: 'abc@sgrids.io',
      ipaddress: getClientIp(request) ?? '-',
      auditdate: getTime(new Date()),
    };

    const versionid = await this._versionBusiness.generateVersion();
    const plant: IArmaxViewDataScrapperPlant = this._configUtil.sanitizePlant(
      {
        ...payload.plant,
        updatedat: audit,
      },
      versionid,
    );

    const blocks: IArmaxViewDataScrapperBlock[] =
      this._configUtil.sanitizeBlocks(payload.blocks, versionid);

    const devices: IArmaxViewDataScrapperDevice[] =
      this._configUtil.sanitizeDevices(payload.devices, versionid);

    await this._devicebusiness.saveMultipleDevice(devices);
    await this._blockBusiness.saveMultipleBlocks(blocks);
    await this._plantBusiness.createPlant(plant);

    this._redisDataService.setupRedisData(
      plant,
      blocks,
      devices,
      versionid,
      true,
    );
    await this._versionBusiness.saveVersion(versionid, audit);
    this._logger.log('Configuration loaded sucessfully...!!!');
    this._messageQueueService.sendAppRestartRequest();
    return {
      error: false,
      data: 'Configuration loaded sucessfully...!!!',
    };
  }

  @Post('/reload')
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseString),
    },
  })
  @HttpCode(HttpStatus.OK)
  async loadConfig(): Promise<ResponseString> {
    const version = await this._versionBusiness.getLatestVerion();
    if (version) {
      const plant: IArmaxViewDataScrapperPlant | null =
        await this._plantBusiness.getCurrentVersionPlant(version.versionid);

      const blocks: IArmaxViewDataScrapperBlock[] =
        await this._blockBusiness.getCurrentVersionBlocks(version.versionid);

      const devices: IArmaxViewDataScrapperDevice[] =
        await this._devicebusiness.getCurrentVersionDevices(version.versionid);
      if (plant && devices && devices.length) {
        this._redisDataService.setupRedisData(
          plant,
          blocks,
          devices,
          version.versionid,
          true,
        );
        this._logger.log('Configuration loaded sucessfully...!!!');
        this._messageQueueService.sendAppRestartRequest();
      }
    }
    return {
      error: false,
      data: 'Configuration loaded sucessfully...!!!',
    };
  }

  @Delete()
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      $ref: getSchemaPath(ResponseString),
    },
  })
  @HttpCode(HttpStatus.OK)
  async deleteVersion() {
    await this._versionBusiness.removeLastVersion();
    const latestVersion = await this._versionBusiness.getLatestVerion();
    if (!latestVersion) {
      throw new ValidationException('No version found');
    }
    const devices: IArmaxViewDataScrapperDevice[] =
      await this._devicebusiness.getCurrentVersionDevices(
        latestVersion?.versionid,
      );

    const blocks: IArmaxViewDataScrapperBlock[] =
      await this._blockBusiness.getCurrentVersionBlocks(
        latestVersion?.versionid,
      );

    const plant = await this._plantBusiness.getCurrentVersionPlant(
      latestVersion?.versionid,
    );

    if (!plant) {
      throw new ValidationException('Invalid Plant');
    }
    await this._redisDataService.setupRedisData(
      plant,
      blocks,
      devices,
      latestVersion?.versionid,
      true,
    );
    return {
      error: false,
      data: 'Configuration reverted sucessfully...!!!',
    };
  }
}
