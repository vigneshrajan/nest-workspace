// opcua.service.ts

import { IDeviceOPCUAMeta } from '@armax_cloud/radiatics-models';
import { Logger } from '@nestjs/common';
import {
  AttributeIds,
  ClientSession,
  DataValue,
  MessageSecurityMode,
  OPCUAClient,
  ReadValueIdOptions,
  SecurityPolicy,
  UserIdentityInfo,
  UserTokenType,
  Variant,
} from 'node-opcua';
import { IParameterSet } from '../models';

export class OpcuaClient {
  private readonly logger = new Logger(OpcuaClient.name);
  private _opcuameta?: IDeviceOPCUAMeta;
  private _client: OPCUAClient;
  private _session: ClientSession;
  private _userinfo: UserIdentityInfo;
  private _serverEndpoint: string;
  // private _maxRetryDelay: number = 10 * 1000;
  private _isConnected: boolean = false;

  constructor(
    deviceip: string,
    deviceport: number = 4840,
    opcuameta?: IDeviceOPCUAMeta,
  ) {
    this._opcuameta = opcuameta;
    this._serverEndpoint = `opc.tcp://${deviceip}:${deviceport}/${
      this._opcuameta?.endpoint || ''
    }`;

    this.iniConnection();
  }

  private iniConnection = async () => {
    if (this._session) {
      this._session.close(true);
    }

    if (this._client) {
      await this._client.disconnect();
    }

    this._client = OPCUAClient.create({
      securityMode:
        this._opcuameta?.securitymode !== undefined
          ? MessageSecurityMode[this._opcuameta.securitymode]
          : MessageSecurityMode.None,
      securityPolicy:
        this._opcuameta?.securitypolicy !== undefined
          ? this._opcuameta.securitypolicy
          : SecurityPolicy.None,
      endpointMustExist: false,
      // defaultSecureTokenLifetime: 60000,
      connectionStrategy: {
        maxRetry: 1,
        initialDelay: 1000,
        maxDelay: 1000 * 2,
      },
    });
    // AnonymousIdentity
    this._userinfo = { type: UserTokenType.Anonymous };

    // UserIdentityInfoX509
    if (this._opcuameta?.certificate && this._opcuameta?.privatekey) {
      this._userinfo = {
        type: UserTokenType.Certificate,
        certificateData: Buffer.from(this._opcuameta.certificate, 'utf-8'),
        privateKey: this._opcuameta.privatekey,
      };
    }

    // UserIdentityInfoUserName
    if (this._opcuameta?.username && this._opcuameta?.password) {
      this._userinfo = {
        type: UserTokenType.UserName,
        userName: this._opcuameta.username,
        password: this._opcuameta.password,
      };
    }

    //reconnect -strategy
    this._client.on('connection_failed', async () => {
      this._isConnected = false;
    });

    this._client.on('backoff', async () => {
      this._isConnected = false;
    });

    this._client.on('abort', async () => {
      this._isConnected = false;
    });
    this._client.on('connection_lost', async () => {
      this._isConnected = false;
    });

    this._client.on('timed_out_request', async () => {
      this._isConnected = false;
    });

    this._client.on('connected', async () => {
      this._session = await this._client.createSession(this._userinfo);
      this._isConnected = true;

      this._session.on('session_closed', async () => {
        this._isConnected = false;
      });

      this._session.on('session_restored', () => {
        this._isConnected = true;
      });
    });
    this._client.on('connection_reestablished', async () => {
      await this._client
        .reactivateSession(this._session)
        .then(() => {
          this._isConnected = true;
        })
        .catch(() => {});
    });
  };

  isConnected = () => this._isConnected;

  connect = async (): Promise<void> => {
    this._client
      .connect(this._serverEndpoint)
      .catch((error: { message: any }) => {
        this.logger.error(
          `Error connecting to OPC UA server: ${error.message}`,
        );
        this._isConnected = false;
      });
  };

  disconnect = async (): Promise<void> => {
    if (this._session) {
      await this._session.close();
      this.logger.log('Session closed');
    }
    if (this._client) {
      await this._client.disconnect();
      this.logger.log('Disconnected from OPC UA server');
    }
  };

  readNodeValue = async (nodes: Array<IParameterSet>): Promise<DataValue[]> =>
    new Promise((resolve, reject) => {
      if (this._isConnected && this._session && !this._session.isReconnecting) {
        const nodeides = nodes.map(
          (node) =>
            <ReadValueIdOptions>{
              nodeId: node.parameter.parametermeta.opcua?.nodeid,
              attributeId: AttributeIds.Value,
            },
        );

        const timer = setTimeout(() => {
          this._isConnected = false;
          return reject();
        }, 2000);

        this._session.read(nodeides, (error, data) => {
          clearTimeout(timer);
          if (error || !data) {
            return reject();
          }
          return resolve(data);
        });
      } else {
        return reject();
      }
    });

  writeNodeValue = async (nodeId: string, value: Variant): Promise<void> => {
    try {
      await this._session.write([
        {
          nodeId,
          attributeId: AttributeIds.Value,
          value: {
            value,
          },
        },
      ]);
      this.logger.log(`Wrote value ${value} to node ${nodeId}`);
    } catch (error) {
      this.logger.error(`Error writing node value: ${error.message}`);
      throw error;
    }
  };
}
