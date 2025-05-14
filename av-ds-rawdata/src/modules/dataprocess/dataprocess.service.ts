import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Config, MessageQueueConstant } from '@library/av-ds-library';
import { Injectable, Logger } from '@nestjs/common';
import { DeviceLatestDataService } from './device-latest-data.service';
import { DeviceSamplerService } from './device-sampler.service';

import { IArmaxViewDataScrapperDevice } from '@armax_cloud/av-models';
import { DATA_CHANNEL } from '@library/av-ds-library/app.constants';
import { ConsumeMessage } from 'amqplib';
import { differenceInSeconds } from 'date-fns';

@Injectable()
export class DataprocessService {
  private readonly logger = new Logger(DataprocessService.name);
  constructor(
    private readonly _deviceLatestDataService: DeviceLatestDataService,
    private readonly _deviceSamplerService: DeviceSamplerService,
  ) {}

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_RAW_COLLECT_TOPIC,
    queue: Config.topics.DATA_RAW_COLLECT_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async collectDevicelatestDataSubscribe(
    payload: object,
    amqpMsg: ConsumeMessage,
  ) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._deviceLatestDataService.collectDeviceLatestData();
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_RAW_SAMPLE_TOPIC,
    queue: Config.topics.DATA_RAW_SAMPLE_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async deviceDataSamplerSubscribe(
    payload: IArmaxViewDataScrapperDevice,
    amqpMsg: ConsumeMessage,
  ) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._deviceSamplerService.processDeviceDataSampler(
          <IArmaxViewDataScrapperDevice>payload,
        );
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      return new Nack();
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_RAW_AGGREGATOR_TOPIC,
    queue: Config.topics.DATA_RAW_AGGREGATOR_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  async deviceDataAggregatorSubscribe(
    payload: object,
    amqpMsg: ConsumeMessage,
  ) {
    try {
      if (
        !amqpMsg.properties.headers?.timestamp ||
        differenceInSeconds(
          new Date(),
          amqpMsg.properties.headers?.timestamp,
        ) <= 2
      ) {
        await this._deviceSamplerService.processDataAggregate();
      }
    } catch (error) {
      this.logger.error(error);
    } finally {
      return new Nack();
    }
  }
}
