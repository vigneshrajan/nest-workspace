import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  Config,
  EXIT_CHANNEL,
  MessageQueueConstant,
} from '@library/av-ds-library';
import { Injectable } from '@nestjs/common';
import { APPNAME, SUBAPPNAME } from './av-ds-rawdata.constants';

@Injectable()
export class AvDsRawdataService {
  getAppName(): string {
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
