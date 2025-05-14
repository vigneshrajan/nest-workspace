import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  Config,
  DATA_CHANNEL,
  DeviceRawDataBusiness,
  EXIT_CHANNEL,
  MessageQueueConstant,
  PPCDeviceBusiness,
} from '@library/av-ds-library';
import { Injectable, Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { differenceInSeconds } from 'date-fns';
import { AvDsBackLogService } from './av-ds-backlog.service';
import { APPNAME, SUBAPPNAME } from './av-ds-postman.constants';
import { IDeviceRawData } from '@armax_cloud/radiatics-models';
import { chunk } from 'lodash';

@Injectable()
export class AvDsPostmanService {
  private readonly _logger = new Logger(AvDsPostmanService.name);
  constructor(
    private readonly _ppcDeviceBusiness: PPCDeviceBusiness,
    private readonly _deviceRawDataBusiness: DeviceRawDataBusiness,
    private readonly _avDsBackLogService: AvDsBackLogService,
  ) {}
  getHello(): string {
    return APPNAME.split('_').join(' ');
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.fanout.name,
    routingKey: Config.topics.KILL_PROCESS_TOPIC,
    queue: `${Config.topics.KILL_PROCESS_TOPIC}_${SUBAPPNAME}`,
    queueOptions: {
      channel: EXIT_CHANNEL,
    },
  })
  public async processExit() {
    setTimeout(() => {
      process.exit(0);
    }, 1000);
    return new Nack();
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_BACKLOG_PERSECOND_TOPIC,
    queue: Config.topics.DATA_BACKLOG_PERSECOND_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async sendPPCDeviceRawData(payload: object, amqpMsg: ConsumeMessage) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        // Geeting older records since latest data are sent while processing raw data.
        const ppcRecords: Array<IDeviceRawData> =
          await this._ppcDeviceBusiness.getPPCDeviceRecords(
            Config.cron.ppcdatabatchpush,
            1,
          );

        if (ppcRecords.length > 0) {
          const recodscale = chunk(ppcRecords, 25);
          const promisemap = recodscale.map((_ppcrecords) =>
            this._avDsBackLogService.sendPPCDeviceRawData(_ppcrecords),
          );
          await Promise.all(promisemap);
        }
      }
    } catch (error) {
      this._logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_BACKLOG_PERMINUTE_TOPIC,
    queue: Config.topics.DATA_BACKLOG_PERMINUTE_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async sendDeviceBacklogData(payload: object, amqpMsg: ConsumeMessage) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        const rawdata: Array<IDeviceRawData> =
          await this._deviceRawDataBusiness.getDeviceRawData(
            Config.cron.scadadatabatchpush,
          );

        if (rawdata && rawdata.length) {
          const recodscale = chunk(rawdata, 20);
          const promisemap = recodscale.map((_rawdata) =>
            this._avDsBackLogService.sendDeviceRawData(_rawdata),
          );
          await Promise.all(promisemap);
        }
      }
    } catch (error) {
      this._logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_BACKLOG_NOTIFICATION_ALERT_TOPIC,
    queue: Config.topics.DATA_BACKLOG_NOTIFICATION_ALERT_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async sendDeviceNotificationAlerts(payload: object, amqpMsg: ConsumeMessage) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._avDsBackLogService.sendDeviceNotificationAlerts();
      }
    } catch (error) {
      this._logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_BACKLOG_NOTIFICATION_EVENT_TOPIC,
    queue: Config.topics.DATA_BACKLOG_NOTIFICATION_EVENT_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async sendDeviceNotificationEvents(payload: object, amqpMsg: ConsumeMessage) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._avDsBackLogService.sendDeviceNotificationEvents();
      }
    } catch (error) {
      this._logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_CLEANUP_TOPIC,
    queue: `${Config.topics.DATA_CLEANUP_TOPIC}`,
    queueOptions: {
      channel: EXIT_CHANNEL,
    },
  })
  public async cleanupQueueSubscribe(payload: object, amqpMsg: ConsumeMessage) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._ppcDeviceBusiness.deleteBacklogData();
      }
    } catch (error) {
      this._logger.error(error);
    } finally {
      return new Nack();
    }
  }
}
