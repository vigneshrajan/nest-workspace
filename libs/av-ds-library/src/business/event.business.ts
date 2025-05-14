import { ArmaxViewDataBaseTables } from '@armax_cloud/av-models';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db, ObjectId } from 'mongodb';
import {
  IArmaxViewDataScrapperEvent,
  IArmaxViewDataScrapperEventWithFlag,
} from '../models';

@Injectable()
export class EventBusiness {
  private readonly _eventCollection =
    this._connection.collection<IArmaxViewDataScrapperEvent>(
      ArmaxViewDataBaseTables.events,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {}

  saveEvents = (events: IArmaxViewDataScrapperEventWithFlag[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const query = events.map(({ _id, isevent, ...event }) => ({
      updateOne: {
        filter: {
          referenceid: new ObjectId(event.referenceid).toString(),
        },
        update: { $set: { ...event } },
        upsert: true,
      },
    }));
    return this._eventCollection.bulkWrite(query, { ordered: true });
  };

  updateStatusOnSent = (referenceids: ObjectId[]) =>
    this._eventCollection.updateMany(
      { _id: { $in: referenceids } },
      { $set: { statusonsent: true } },
    );

  getLastEventByNotificationId = (notificationid: string) =>
    this._eventCollection.findOne(
      { notificationid },
      { sort: { alertenddatetime: -1 } },
    );

  getPendingNotifications = (limit: number) =>
    this._eventCollection
      .find(
        {
          statusonsent: false,
        },
        {
          projection: { statusonsent: 0 },
          limit,
          sort: { _id: -1 },
        },
      )
      .toArray();
}
