import { IArmaxViewDataScrapperDevice } from '@armax_cloud/av-models';
import { PROTOCOL } from '@armax_cloud/radiatics-models';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  DATA_CHANNEL,
  EXIT_CHANNEL,
  PROTOCOL_CHANNEL,
} from '@library/av-ds-library/app.constants';
import { Injectable } from '@nestjs/common';
import { getTime } from 'date-fns';
import { Config } from '../../app.config';
import {
  IDeviceDataDifference,
  ProtocolWriteModbusRequest,
  ProtocolWriteOpcUARequest,
  ProtocolWriteSnmpRequest,
  SaveDevicesData,
} from '../../models';
import { MessageQueueConstant } from './message-queue.constant';

@Injectable()
export class MessageQueueService {
  constructor(private readonly amqpConnection: AmqpConnection) {
    // queue assignment - MODBUS & OPCUA
    Array.from({ length: Config.protocolinstances }).map((_, index) => {
      amqpConnection.channels[PROTOCOL_CHANNEL].assertQueue(
        `${Config.topics.DATA_PROTOCOL_COLLECT_TOPIC}_MODBUS-${index + 1}`,
        {
          durable: true,
          arguments: {
            'x-message-deduplication': true,
            'x-max-priority': 2,
          },
        },
      );
      amqpConnection.channels[PROTOCOL_CHANNEL].assertQueue(
        `${Config.topics.DATA_PROTOCOL_COLLECT_TOPIC}_OPCUA-${index + 1}`,
        {
          durable: true,
          arguments: {
            'x-message-deduplication': true,
            'x-max-priority': 2,
          },
        },
      );
      amqpConnection.channels[PROTOCOL_CHANNEL].assertQueue(
        `${Config.topics.DATA_PROTOCOL_COLLECT_TOPIC}_SNMP-${index + 1}`,
        {
          durable: true,
          arguments: {
            'x-message-deduplication': true,
            'x-max-priority': 2,
          },
        },
      );
    });

    Object.values(Config.topics)
      .filter(
        (topic) =>
          ![
            Config.topics.DATA_PROTOCOL_COLLECT_TOPIC,
            Config.topics.KILL_PROCESS_TOPIC,
            Config.topics.DATA_RAW_LATEST_TOPIC,
          ].includes(topic),
      )
      .map((topic) => {
        amqpConnection.channels[
          topic !== Config.topics.KILL_PROCESS_TOPIC
            ? EXIT_CHANNEL
            : DATA_CHANNEL
        ].assertQueue(topic, {
          durable: true,
          // messageTtl: 1000,
          arguments: {},
        });
      });
  }

  sendProtocolReadRequest = (
    protocol: PROTOCOL,
    instanceId: number,
    headerKey: string,
    message: IArmaxViewDataScrapperDevice[],
  ) =>
    this.amqpConnection.channels[PROTOCOL_CHANNEL].sendToQueue(
      `${Config.topics.DATA_PROTOCOL_COLLECT_TOPIC}_${PROTOCOL[protocol]}-${instanceId}`,
      Buffer.from(JSON.stringify(message), 'utf-8'),
      {
        headers: {
          operationName: 'READ',
          'x-deduplication-header': `${headerKey}-READ`,
          timestamp: getTime(new Date()),
        },
        priority: 0,
        expiration: 10000,
      },
    );

  sendProtocolWriteRequest = (
    protocol: PROTOCOL,
    instanceId: number,
    payload:
      | ProtocolWriteModbusRequest
      | ProtocolWriteOpcUARequest
      | ProtocolWriteSnmpRequest,
  ) =>
    this.amqpConnection.channels[PROTOCOL_CHANNEL].sendToQueue(
      `${Config.topics.DATA_PROTOCOL_COLLECT_TOPIC}_${PROTOCOL[protocol]}-${instanceId}`,
      Buffer.from(JSON.stringify(payload), 'utf-8'),
      {
        headers: {
          operationName: 'WRITE',
          'x-deduplication-header': `${PROTOCOL[protocol].toLocaleLowerCase()},${getTime(
            new Date(),
          )},${payload.deviceip},${payload.deviceport}-WRITE`,
          timestamp: getTime(new Date()),
        },
        priority: 1,
      },
    );

  sendNotificationRequest = (data: IDeviceDataDifference[]) =>
    this.amqpConnection.channels[DATA_CHANNEL].sendToQueue(
      Config.topics.DATA_RAW_NOTIFICATION_TOPIC,
      Buffer.from(JSON.stringify(data), 'utf-8'),
      {
        headers: {
          timestamp: getTime(new Date()),
        },
      },
    );

  sendDataSampleRequest = (device: IArmaxViewDataScrapperDevice) =>
    this.amqpConnection.publish(
      MessageQueueConstant.direct.name,
      Config.topics.DATA_RAW_SAMPLE_TOPIC,
      Buffer.from(JSON.stringify(device), 'utf-8'),
      {
        headers: {
          timestamp: getTime(new Date()),
        },
      },
    );

  sendCommonRequest = (queueName: string) =>
    this.amqpConnection.publish(
      MessageQueueConstant.direct.name,
      queueName,
      Buffer.from(JSON.stringify({ timestamp: getTime(new Date()) }), 'utf-8'),
      {
        headers: {
          timestamp: getTime(new Date()),
        },
      },
    );

  sendAppRestartRequest = () =>
    this.amqpConnection.publish(
      MessageQueueConstant.fanout.name,
      Config.topics.KILL_PROCESS_TOPIC,
      Buffer.from(JSON.stringify({ timestamp: getTime(new Date()) }), 'utf-8'),
      {
        headers: {
          timestamp: getTime(new Date()),
        },
      },
    );

  publishLatestData = (data: SaveDevicesData) =>
    this.amqpConnection.publish(
      MessageQueueConstant.direct.name,
      Config.topics.DATA_RAW_LATEST_TOPIC,
      Buffer.from(
        JSON.stringify({ ...data, timestamp: getTime(new Date()) }),
        'utf-8',
      ),
      {
        headers: {
          timestamp: getTime(new Date()),
        },
      },
    );
}
