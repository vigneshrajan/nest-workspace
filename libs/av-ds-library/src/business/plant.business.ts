import {
  ArmaxViewDataBaseTables,
  IArmaxViewDataScrapperPlant,
} from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db } from 'mongodb';
import { RedisDataService } from '../modules';

@Injectable()
export class PlantBusiness {
  private readonly _plantCollection =
    this._connection.collection<IArmaxViewDataScrapperPlant>(
      ArmaxViewDataBaseTables.plants,
    );
  constructor(
    @InjectConnection() private readonly _connection: Db,
    private readonly _redisDataService: RedisDataService,
  ) {
    // this._plantCollection
    //   .createIndex({ versionid: 1 }, { background: true })
    //   .then()
    //   .catch();
  }

  createPlant = (plant: IArmaxViewDataScrapperPlant) =>
    this._plantCollection.insertOne(plant);
  deletePlant = () => this._plantCollection.deleteMany({});
  getPlant = () => this._plantCollection.findOne({});
  getCurrentVersionPlant = (versionid: string) =>
    this._plantCollection.findOne({ versionid });

  getPlantTimezone = async (versionid: string) => {
    let plant: IArmaxViewDataScrapperPlant | null =
      await this._redisDataService.getPlant();
    if (!plant) {
      plant = await this.getCurrentVersionPlant(versionid);
      if (plant) {
        this._redisDataService.setPlant(plant);
      }
    }

    return plant?.planttimezone?.utcOffset ?? 0;
  };
}
