import { IRedisService } from '@armax_cloud/radiatics-libraries';

import {
  IArmaxViewDataScrapperBlock,
  IArmaxViewDataScrapperDevice,
  IArmaxViewDataScrapperPlant,
} from '@armax_cloud/av-models';
import { LATESTVERSIONID } from '@library/av-ds-library/app.constants';
import { Injectable, Scope } from '@nestjs/common';
import { getTime } from 'date-fns';
import { SaveDevicesData } from '../../models';

@Injectable({ scope: Scope.DEFAULT })
export class RedisDataService {
  plant: IArmaxViewDataScrapperPlant;
  constructor(private readonly _iRedis: IRedisService) {}
  setupRedisData = async (
    plant: IArmaxViewDataScrapperPlant,
    blocks: IArmaxViewDataScrapperBlock[],
    devices: IArmaxViewDataScrapperDevice[],
    versionid?: string,
    isBuild = false,
  ) => {
    await this._iRedis.connection().flushdb();
    const redisPipeline = this.getPipeline();
    redisPipeline.set('PLANTCONFIG', JSON.stringify(plant));

    blocks.forEach((block) => {
      redisPipeline.set(
        `BLOCKCONFIG-${block.blockid.toString()}`,
        JSON.stringify(block),
      );
    });

    devices.forEach((device) => {
      redisPipeline.set(
        `DEVICECONFIG-${device.deviceid.toString()}`,
        JSON.stringify(device),
      );
    });

    if (versionid) {
      this.setVersionId(versionid);
    }

    if (isBuild) {
      devices.forEach((device) => {
        const devicedata = {
          timestamp: getTime(new Date()),
          deviceid: device.deviceid,
          parameters: {},
        };

        if (device.parameters) {
          devicedata.parameters = Object.fromEntries(
            device.parameters.map((parameter) => [
              parameter.parametername,
              null,
            ]),
          );
        }

        if (device.deviceips !== undefined) {
          device.deviceips.map((deviceip) => {
            redisPipeline.set(
              `${device.deviceid.toString()}-${deviceip}-lastsent`,
              JSON.stringify({ deviceip, ...devicedata }),
            );
            redisPipeline.set(
              `${device.deviceid.toString()}-${deviceip}-current`,
              JSON.stringify({ deviceip, ...devicedata }),
            );
          });
        }
      });
    }
    await redisPipeline.exec();
  };

  getKeys = async (key: string) => this._iRedis.connection().keys(key);

  getDataByKeys = async (keys: Array<string>) =>
    this._iRedis.connection().mget(keys);

  deleteKeys = (...keys: string[]) => this._iRedis.connection().del(keys);
  disconnect = () => {
    this._iRedis.disconnect();
  };

  getDataByKey = (key: string) => this._iRedis.connection().get(key);
  setDataByKey = (key: string, value: string | number | Buffer) =>
    this._iRedis.connection().set(key, value);

  getPipeline = () => this._iRedis.connection().pipeline();

  saveDeviceData = async (
    payload: SaveDevicesData,
    postfix: 'lastsent' | 'current',
  ) => {
    const { data } = payload;
    const redisPipeline = this.getPipeline();
    Object.values(data).map((device) => {
      redisPipeline.set(
        `${device.deviceid.toString()}-${device.deviceip}-${postfix}`,
        JSON.stringify(device),
      );
    });
    await redisPipeline.exec();
  };

  getPlant = async () => {
    if (!this.plant) {
      const plantConfigString = await this.getDataByKey('PLANTCONFIG');
      if (plantConfigString) {
        const plantConfig = <IArmaxViewDataScrapperPlant>(
          JSON.parse(plantConfigString)
        );
        this.plant = plantConfig;
      }
    }

    return this.plant;
  };

  setPlant = async (plant: IArmaxViewDataScrapperPlant) => {
    await this.setDataByKey('PLANTCONFIG', JSON.stringify(plant));
    this.plant = plant;
  };

  setVersionId = async (versionid: string) => {
    await this.setDataByKey(LATESTVERSIONID, JSON.stringify(versionid));
  };

  getVersionId = async () => {
    const version = await this.getDataByKey(LATESTVERSIONID);
    return version ? JSON.parse(version) : version;
  };
}
