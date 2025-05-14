import { LoggerService } from '@armax_cloud/radiatics-libraries';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import {
  DATA_CHANNEL,
  EXIT_CHANNEL,
  PROTOCOL_CHANNEL,
} from '@library/av-ds-library/app.constants';
import { Module } from '@nestjs/common';
import { AuditLogger, Config, Logger } from '../../app.config';
import { MessageQueueConstant } from './message-queue.constant';
import { MessageQueueService } from './message-queue.service';

@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      exchanges: [
        {
          name: MessageQueueConstant.direct.name,
          type: MessageQueueConstant.direct.type,
          options: {
            durable: true,
          },
          createExchangeIfNotExists: true,
        },
        {
          name: MessageQueueConstant.fanout.name,
          type: MessageQueueConstant.fanout.type,
          options: {
            durable: true,
          },
          createExchangeIfNotExists: true,
        },
      ],
      channels: {
        [PROTOCOL_CHANNEL]: {
          default: true,
          // prefetchCount: (Config.protocolinstances ?? 1) * 10,
          prefetchCount: 1,
        },
        [DATA_CHANNEL]: {
          default: true,
          prefetchCount: 1,
        },
        [EXIT_CHANNEL]: {
          default: true,
          prefetchCount: 1,
        },
      },
      uri: Config.rabbitmq.connectionstring,
      connectionInitOptions: { wait: true },
      logger: new LoggerService(AuditLogger, Logger),
    }),
    MessageQueueModule,
  ],
  providers: [MessageQueueService],
  exports: [MessageQueueService],
})
export class MessageQueueModule {}
