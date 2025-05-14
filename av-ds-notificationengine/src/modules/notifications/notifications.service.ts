import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  Config,
  DATA_CHANNEL,
  IDeviceDataDifference,
  MessageQueueConstant,
} from '@library/av-ds-library';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationProcessBusiness } from '../../business/notification.process.business';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly _notificationProcessBusiness: NotificationProcessBusiness,
  ) {}

  async onModuleInit() {
    try {
      await this._notificationProcessBusiness.initNotificationsintoRedis();
    } catch (error) {
      this.logger.error(error);
    }
  }

  @RabbitSubscribe({
    exchange: MessageQueueConstant.direct.name,
    routingKey: Config.topics.DATA_RAW_NOTIFICATION_TOPIC,
    queue: Config.topics.DATA_RAW_NOTIFICATION_TOPIC,
    queueOptions: {
      channel: DATA_CHANNEL,
    },
  })
  public async notificationQueueSubscribe(payload: IDeviceDataDifference[]) {
    try {
      await this._notificationProcessBusiness.processNotificationPayload(
        payload,
      );
    } catch (error) {
      this.logger.error(error);
    } finally {
      return new Nack();
    }
  }
}
