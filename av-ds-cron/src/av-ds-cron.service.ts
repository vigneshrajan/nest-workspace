import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Config, MessageQueueConstant } from '@library/av-ds-library';
import { EXIT_CHANNEL } from '@library/av-ds-library/app.constants';
import { Injectable } from '@nestjs/common';
import { APPNAME, SUBAPPNAME } from './av-ds-cron.constants';

@Injectable()
export class AvDsCronService {
  getTitle(): string {
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
}
