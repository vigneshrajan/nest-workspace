import {
  DataScrapperVersionBusiness,
  RedisDataService,
} from '@library/av-ds-library';
import { Injectable } from '@nestjs/common';
@Injectable()
export class DsVersionService {
  private _currentVersionID: string | null;

  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _versionBusiness: DataScrapperVersionBusiness,
  ) {}

  // check DB for latest version and update redis
  getLatestversion = async () => {
    if (!this._currentVersionID) {
      const currentVersion = await this._versionBusiness.getLatestVerion();
      if (currentVersion) {
        await this._redisDataService.setDataByKey(
          'versionid',
          currentVersion.versionid,
        );
        this._currentVersionID = currentVersion.versionid;
      }
    }
    if (!this._currentVersionID) {
      throw new Error('Current Version is not set or availble');
    }
    return this._currentVersionID;
  };
}
