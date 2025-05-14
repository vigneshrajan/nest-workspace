import { Session, VarBind, DataTypes } from 'snmp-native';
import { DeviceOperationWriteSnmpRequest } from '../models';

export class SnmpClient {
  private _host: string;
  private _port: number = 161;
  private _community: string = 'public';
  private _session: Session;

  constructor(
    host: string,
    port: number,
    community?: string,
    connectionTimeout?: number,
  ) {
    if (!host) {
      throw new Error('Invalid IP host');
    }

    this._host = host;
    if (!port) {
      this._port = port;
    }

    if (community) {
      this._community = community;
    }

    this._session = new Session({
      host: this._host,
      port: this._port,
      community: this._community,
      timeouts: [connectionTimeout ?? 1000],
    });
  }

  disconnect = () => {
    this._session.close();
  };

  read = (oids: Array<string>) =>
    new Promise<{ [oid: string]: number | string | null }>(
      (resolve, reject) => {
        this._session.getAll({ oids }, (error, varbinds) => {
          if (error) {
            reject(error);
          }

          const converteddata = this.dataConvertion(varbinds);
          resolve(converteddata);
        });
      },
    );

  private writeSingleOid = (oid: DeviceOperationWriteSnmpRequest) =>
    new Promise((resolve, reject) => {
      this._session.set(oid, (error, varbinds) => {
        if (error) {
          return reject(error);
        }
        return resolve(varbinds);
      });
    });

  write = (oids: DeviceOperationWriteSnmpRequest[]) => {
    const promiseMap = oids.map((oid) => this.writeSingleOid(oid));
    return Promise.all(promiseMap);
  };

  private dataConvertion = (varbinds: VarBind[]) => {
    const values: { [oid: string]: number | string | null } =
      Object.fromEntries(
        varbinds.map((varbind) => {
          switch (varbind.type) {
            case DataTypes.Integer:
              return [varbind.oid, parseInt(varbind.value, 16)];
            case DataTypes.OctetString:
            case DataTypes.IpAddress:
              return [varbind.oid, varbind.value];
            case DataTypes.TimeTicks: {
              const timetickvalue = Math.floor(
                (parseInt(varbind.value, 10) * 10) / 1000,
              );
              const hours = Math.floor(timetickvalue / 3600);
              const minutes = Math.floor((timetickvalue - hours * 3600) / 60);
              const seconds = timetickvalue - hours * 3600 - minutes * 60;
              return [
                varbind.oid,
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
              ];
            }
            case DataTypes.NoSuchObject:
            case DataTypes.NoSuchInstance:
            case DataTypes.EndOfMibView:
              return [varbind.oid, null];
            default:
              return [varbind.oid, varbind.value];
          }
        }),
      );
    return values;
  };
}
