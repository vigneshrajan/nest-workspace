import {
  ArmaxViewDataBaseTables,
  IArmaxViewDeviceRawData,
} from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { getTime, subDays } from 'date-fns';
import { Db, ObjectId } from 'mongodb';
import { Config } from '../app.config';
@Injectable()
export class DeviceRawDataBusiness {
  private readonly _deviceRawDataCollection =
    this._connection.collection<IArmaxViewDeviceRawData>(
      ArmaxViewDataBaseTables.devicerawdata,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {
    // this._deviceRawDataCollection
    //   .createIndex({ readytodelete: 1 }, { background: true })
    //   .then()
    //   .catch();
  }

  saveManyData = (rawdatas: IArmaxViewDeviceRawData[]) =>
    this._deviceRawDataCollection.insertMany(rawdatas);

  makeReadyToDelete = (ids: string[]) => {
    this._deviceRawDataCollection.updateMany(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { $set: { readytodelete: true } },
      { upsert: true },
    );
  };

  removeOldData = () => {
    this._deviceRawDataCollection.deleteMany({
      timestamp: getTime(
        subDays(new Date(), Config.cron.scadadataretensionindays ?? 21),
      ),
    });
  };

  getDeviceRawData = (limit: number = 60) =>
    this._deviceRawDataCollection
      .find(
        {
          $or: [
            { readytodelete: { $exists: false } },
            { readytodelete: false },
          ],
        },
        { limit },
      )
      .toArray();
}
