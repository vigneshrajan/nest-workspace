import {
  ArmaxViewDataBaseTables,
  IArmaxViewDataScrapperDevice,
} from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db, DeleteResult } from 'mongodb';

@Injectable()
export class DeviceBusiness {
  private readonly _deviceCollection =
    this._connection.collection<IArmaxViewDataScrapperDevice>(
      ArmaxViewDataBaseTables.devices,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {
    // this._deviceCollection
    //   .createIndex({ versionid: 1 }, { background: true })
    //   .then()
    //   .catch();
    // this._deviceCollection
    //   .createIndex(
    //     { versionid: 1, deviceid: 1 },
    //     { background: true, unique: true },
    //   )
    //   .then()
    //   .catch();
  }

  saveMultipleDevice = (devices: Array<IArmaxViewDataScrapperDevice>) =>
    this._deviceCollection.insertMany(devices);
  deleteAll = (): Promise<DeleteResult> =>
    this._deviceCollection.deleteMany({});
  getAll = () => this._deviceCollection.find().toArray();
  getCurrentVersionDevices = (versionid: string) =>
    this._deviceCollection.find({ versionid }).toArray();
}
