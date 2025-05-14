import {
  ArmaxViewDataBaseTables,
  IArmaxViewDataScrapperBlock,
} from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db, DeleteResult } from 'mongodb';

@Injectable()
export class BlockBusiness {
  private readonly _blockCollection =
    this._connection.collection<IArmaxViewDataScrapperBlock>(
      ArmaxViewDataBaseTables.blocks,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {}

  saveMultipleBlocks = (blocks: Array<IArmaxViewDataScrapperBlock>) =>
    this._blockCollection.insertMany(blocks);
  deleteAll = (): Promise<DeleteResult> => this._blockCollection.deleteMany({});
  getAll = () => this._blockCollection.find().toArray();
  getCurrentVersionBlocks = (versionid: string) =>
    this._blockCollection.find({ versionid }).toArray();
}
