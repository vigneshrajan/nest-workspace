import {
  ArmaxViewDataBaseTables,
  IArmaxViewDeviceRawDataSample,
} from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { getTime, startOfMinute, subDays } from 'date-fns';
import { Db, ObjectId } from 'mongodb';
import { Config } from '../app.config';

@Injectable()
export class DeviceDataSamplerBusiness {
  private readonly _rawdataSampleCollection =
    this._connection.collection<IArmaxViewDeviceRawDataSample>(
      ArmaxViewDataBaseTables.devicerawdatasample,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {
    // this._rawdataSampleCollection
    //   .createIndex({ deviceid: 1, readytodelete: 1 }, { background: true })
    //   .then()
    //   .catch();
  }

  saveDeviceSampleData = (payload: IArmaxViewDeviceRawDataSample) =>
    this._rawdataSampleCollection.insertOne(payload);

  getDeviceSampleData = () =>
    this._rawdataSampleCollection
      .aggregate([
        {
          $match: {
            timestamp: { $lt: getTime(startOfMinute(new Date())) },
            readytodelete: false,
          },
        },
        {
          $group: {
            _id: {
              $subtract: ['$timestamp', { $mod: ['$timestamp', 1000 * 60] }],
            },
            data: { $push: '$$ROOT' },
          },
        },
        {
          $limit: 60 * 10,
        },
      ])
      .toArray();

  makeReadyToDelete = (ids: Array<ObjectId>) =>
    this._rawdataSampleCollection.updateMany(
      { _id: { $in: ids } },
      { $set: { readytodelete: true } },
      { upsert: true },
    );

  removeOldData = () =>
    this._rawdataSampleCollection.deleteMany({
      timestamp: getTime(
        subDays(new Date(), Config.cron.scadadataretensionindays ?? 21),
      ),
    });
}
