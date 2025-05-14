import { ModbusFunctionCode } from '@armax_cloud/radiatics-models';
import ModbusRTU from 'modbus-serial';
import { ReadCoilResult, ReadRegisterResult } from 'modbus-serial/ModbusRTU';
import { Socket } from 'net';
import { IModbusRead } from '../models';

export class ModbusClient {
  private _host: string = '127.0.0.1';
  private _port: number = 502;
  private _socketClient: Socket | null = null;
  private _modbusClient: ModbusRTU | null = null;
  private _isConnected: boolean = false;

  // private readonly _logger = new Logger(ModbusClient.name);
  constructor(host: string, port: number) {
    if (!host) {
      throw new Error('Invalid Host');
    } else {
      this._host = host;
    }

    this._port = port ?? this._port;
  }

  connect = (connectionTimeout: number) =>
    new Promise(async (resolve, reject) => {
      if (this._isConnected) {
        // console.log(this._host, ' : Connection open');
        return resolve('Connection open');
      }

      const timer = setTimeout(() => {
        socket.end();
        client.destroy(() => {});
        this._disconnect();
        // console.log(this._host, ' : Connection reached max timeout');

        return reject('Connection reached max timeout');
      }, connectionTimeout);

      const socket = new Socket();
      const client = new ModbusRTU();

      socket.setNoDelay(true);
      socket.on('connect', async () => {
        try {
          client.linkTCP(socket, {
            ip: this._host,
            port: this._port,
            keepAlive: true,
            timeout: 99999,
          });
          this._socketClient = socket;
          this._modbusClient = client;
          this._isConnected = true;
          clearTimeout(timer);
          // console.log(this._host, ' : Connected');
          resolve('Connected');
        } catch (error) {
          // console.log(this._host, ' : connection error', error.message);
          this._disconnect();
          reject(error);
        }
      });

      socket.on('error', async (error) => {
        this._disconnect();
        // console.log(this._host, ' : socket error', error.message);
        reject(error);
      });

      client.on('error', (error) => {
        // console.log(
        //   this._host,
        //   ' : client error',
        //   (error as any)?.message ?? '',
        // );
        this._disconnect();
        reject(error);
      });

      client.on('close', () => {
        // console.log(this._host, ' : client closed');
        this._disconnect();
      });

      socket.connect({
        host: this._host,
        port: this._port,
        noDelay: false,
        keepAlive: true,
        keepAliveInitialDelay: connectionTimeout,
      });
    });

  disconnect = async () => {
    this._disconnect();
  };

  setUnitId = (unitid: number) => this._modbusClient?.setID(unitid);

  setClientTimeout = (timeout: number = 1000) =>
    this._modbusClient && this._modbusClient?.setTimeout(timeout * 1.5);

  private _disconnect = () => {
    if (this._modbusClient) {
      this._modbusClient.destroy(() => {});
      this._modbusClient.close(() => {});
      this._modbusClient = null;
    }

    if (this._socketClient && !this._socketClient.destroyed) {
      this._socketClient.destroy();
      this._socketClient = null;
    }

    this._isConnected = false;
  };

  read = async (
    config: IModbusRead,
  ): Promise<ReadCoilResult | ReadRegisterResult | undefined> => {
    if (!this._isConnected) {
      throw new Error('Connection not open');
    }
    const { regaddress, reglength, fc } = config;
    switch (fc) {
      case ModbusFunctionCode.COILSTATUS:
        return this._modbusClient?.readCoils(regaddress, reglength);
      case ModbusFunctionCode.INPUTSTATUS:
        return this._modbusClient?.readDiscreteInputs(regaddress, reglength);
      case ModbusFunctionCode.HOLDINGREGISTER:
        return this._modbusClient?.readHoldingRegisters(regaddress, reglength);
      case ModbusFunctionCode.INPUTREGISTER:
        return this._modbusClient?.readInputRegisters(regaddress, reglength);
      default:
        throw new Error('invalid function code');
    }
  };

  write = async (
    startaddress: number,
    values: Array<number> | Array<boolean>,
    isCoils: boolean,
  ) => {
    if (!this._isConnected) {
      throw new Error('Connection not open');
    }
    if (isCoils) {
      this._modbusClient?.writeCoils(
        startaddress,
        values.map((value) => Boolean(value)),
      );
    } else {
      this._modbusClient?.writeRegisters(
        startaddress,
        values.map((value) => Number(value)),
      );
    }
  };

  isConnected = () => this._isConnected;
}
