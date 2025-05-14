import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Db, ObjectId } from 'mongodb';
import {
  IArmaxViewDataScrapperAlert,
  IArmaxViewDataScrapperAlertWithFlag,
} from '../models';
import { ArmaxViewDataBaseTables } from '@armax_cloud/av-models';

@Injectable()
export class AlertBusiness {
  private readonly _alertCollection =
    this._connection.collection<IArmaxViewDataScrapperAlert>(
      ArmaxViewDataBaseTables.alerts,
    );
  constructor(@InjectConnection() private readonly _connection: Db) {}

  saveAlerts = (alerts: IArmaxViewDataScrapperAlertWithFlag[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const query = alerts.map(({ _id, isalert, ...alert }) => ({
      updateOne: {
        filter: {
          referenceid: new ObjectId(alert.referenceid).toString(),
        },
        update: { $set: { ...alert } },
        upsert: true,
      },
    }));
    return this._alertCollection.bulkWrite(query, { ordered: true });
  };

  updateAlertSentStatus = (
    notificationdata: Array<IArmaxViewDataScrapperAlert>,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const query = notificationdata.map(({ _id, ...notification }) => ({
      updateOne: {
        filter: {
          referenceid: new ObjectId(notification.referenceid).toString(),
        },
        update: {
          $set: {
            ...notification,
            ...(notification.alertstatus
              ? { statusonsent: true }
              : { statusonsent: true, statusoffsent: true }),
          },
        },
        upsert: true,
      },
    }));

    return this._alertCollection.bulkWrite(query);
  };

  getPendingNotifications = (limit: number) =>
    this._alertCollection
      .find(
        {
          $or: [
            { statusonsent: false, alertstatus: true },
            { statusoffsent: false, alertstatus: false },
          ],
        },
        {
          projection: { statusonsent: 0, statusoffsent: 0 },
          limit,
          sort: { _id: -1 },
        },
      )
      .toArray();

  getOnAlerts = () =>
    this._alertCollection.find({ $or: [{ statusonsent: false }] }).toArray();

  getOffAlerts = () =>
    this._alertCollection.find({ $or: [{ statusoffsent: false }] }).toArray();

  getLastAlertByNotificationId = (notificationid: string) =>
    this._alertCollection.findOne(
      { notificationid },
      { sort: { alertplantstartdatetime: -1 } },
    );
}
