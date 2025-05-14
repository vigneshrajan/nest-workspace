import {
  ArmaxViewDataBaseTables,
  IArmaxViewDataScrapperVersion,
} from '@armax_cloud/av-models';
import { IAudit } from '@armax_cloud/radiatics-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db } from 'mongodb';
import { generateRandomString } from '../services';

@Injectable()
export class DataScrapperVersionBusiness {
  private readonly _datascrapperVersionCollection =
    this._connection.collection<IArmaxViewDataScrapperVersion>(
      ArmaxViewDataBaseTables.datascrapperversions,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {
    // this._datascrapperVersionCollection
    //   .createIndex({ versionid: 1 }, { background: true, unique: true })
    //   .then()
    //   .catch();
  }

  getVerion = (versionid: string) =>
    this._datascrapperVersionCollection.findOne({ versionid });
  getLatestVerion = () =>
    this._datascrapperVersionCollection.findOne({}, { sort: { _id: -1 } });
  generateVersion = async () => {
    while (true) {
      const versionid = generateRandomString(8);
      if (!(await this.getVerion(versionid))) {
        return versionid;
      }
    }
  };

  saveVersion = (versionid: string, audit: IAudit) =>
    this._datascrapperVersionCollection.insertOne({
      versionid,
      audit,
    });

  getTotalVersions = () => this._datascrapperVersionCollection.countDocuments();
  removeLastVersion = async () => {
    const totalCounts = await this.getTotalVersions();
    if (totalCounts <= 1) {
      throw new Error('Insufficient version to delete');
    }
    const latestversion = await this.getLatestVerion();
    if (latestversion) {
      await this._datascrapperVersionCollection.deleteOne({
        _id: latestversion?._id,
      });
    }
  };
}
