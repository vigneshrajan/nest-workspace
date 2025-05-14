import { ArmaxViewDataBaseTables } from '@armax_cloud/av-models';

import { IDeviceRawData } from '@armax_cloud/radiatics-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db, ObjectId } from 'mongodb';
import { Config } from '../app.config';
import { getTime, subDays } from 'date-fns';
@Injectable()
export class PPCDeviceBusiness {
  private readonly _devicerawdatappcCollection =
    this._connection.collection<IDeviceRawData>(
      ArmaxViewDataBaseTables.devicerawdatappc,
    );

  constructor(@InjectConnection() private readonly _connection: Db) {}
  deleteBacklogData = async () =>
    this._devicerawdatappcCollection.deleteMany({
      readytodelete: true,
      timestamp: getTime(
        subDays(new Date(), Config.cron.perseconddataretentionindays ?? 1),
      ),
    });

  deleteRecordsByDates = async (startTime: number, endTime: number) =>
    this._devicerawdatappcCollection.deleteMany({
      planttimestamp: { $gte: startTime, $lte: endTime },
    });
  updatePPCDeviceData = async (ppcData: IDeviceRawData) => {
    this._devicerawdatappcCollection.updateOne(
      { planttimestamp: ppcData.planttimestamp },
      { $set: { ...ppcData } },
      { upsert: true },
    );
  };

  updateSentPPCRecords = async (ids: Array<ObjectId>) =>
    this._devicerawdatappcCollection.updateMany(
      { _id: { $in: ids } },
      { $set: { readytodelete: true } },
    );

  insertPPCDevicesData = async (ppcdata: Array<IDeviceRawData>) => {
    const bulkUpdateOperations = ppcdata.map((data) => ({
      updateOne: {
        filter: {
          planttimestamp: data.planttimestamp,
        },
        update: {
          $set: {
            readytodelete: false,
            ...data,
          },
        },
        upsert: true,
      },
    }));
    await this._devicerawdatappcCollection.bulkWrite(bulkUpdateOperations);
  };

  getPPCDeviceRecords = async (limit: number = 50, sortorder: 1 | -1) =>
    this._devicerawdatappcCollection
      .find(
        {
          readytodelete: false,
        },
        {
          sort: { planttimestamp: sortorder },
          limit: limit,
        },
      )
      .toArray();
}
