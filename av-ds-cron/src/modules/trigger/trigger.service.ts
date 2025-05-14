import { DeviceType, PROTOCOL } from '@armax_cloud/radiatics-models';
import {
  IArmaxViewDataScrapperDevice,
  DATA_SAMPLE_MAP,
} from '@armax_cloud/av-models';
import { Config } from '@library/av-ds-library/app.config';
import {
  MessageQueueService,
  RedisDataService,
} from '@library/av-ds-library/modules';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { groupBy } from 'lodash';

@Injectable()
export class TriggerService implements OnModuleInit {
  // private readonly _logger = new Logger(TriggerService.name);
  constructor(
    private readonly _redisDataService: RedisDataService,
    private readonly _schedulerRegistry: SchedulerRegistry,
    private readonly _messageQueueService: MessageQueueService,
  ) {}
  async onModuleInit() {
    const protocolenum = Object.fromEntries(
      Object.entries(PROTOCOL).map(([key, value]) => [value, key]),
    );

    // calculate instances
    const protocolIndex = Object.fromEntries(
      Object.entries(PROTOCOL).map(([key]) => [
        key.toString().toLocaleUpperCase(),
        0,
      ]),
    );
    const redisDeviceConfigKeys: Array<string> =
      await this._redisDataService.getKeys('DEVICECONFIG-*');
    if (redisDeviceConfigKeys.length <= 0) {
      return;
    }

    const redisDeviceMapping = await this._redisDataService.getDataByKeys(
      redisDeviceConfigKeys,
    );
    const devicesConfig: Array<IArmaxViewDataScrapperDevice> =
      redisDeviceMapping
        .filter((device: string | null) => device !== null)
        .map((device: string) => JSON.parse(device));

    const devicegroups = groupBy(devicesConfig, (device) => [
      protocolenum[device.deviceprotocol ?? 0]?.toLocaleUpperCase(),
      device.devicedatafetchcron,
      device.deviceips,
      device.deviceport,
    ]);

    //delete redis old instance keys
    const redisInstanceKeys: Array<string> =
      await this._redisDataService.getKeys('INSTANCE-*');
    if (redisInstanceKeys.length) {
      await this._redisDataService.deleteKeys(...redisInstanceKeys);
    }

    const redisPipeline = this._redisDataService.getPipeline();
    // create corn based on device cron pattern
    Object.entries(devicegroups).forEach(
      ([jobkey, devices]: [
        key: string,
        devices: Array<IArmaxViewDataScrapperDevice>,
      ]) => {
        const [protocolname, cronpattern] = jobkey.split(',');
        const protocol = protocolenum[protocolname];

        protocolIndex[protocolname] =
          protocolIndex[protocolname] >= Config.protocolinstances
            ? 1
            : protocolIndex[protocolname] + 1;

        devices.map((device) =>
          redisPipeline.set(
            `INSTANCE-${device.deviceid}`,
            JSON.stringify({
              protocolname,
              protocol: device.deviceprotocol,
              instanceid: protocolIndex[protocolname],
            }),
          ),
        );

        const deviceReadJob = this.createJobForDataRead(
          cronpattern,
          parseInt(protocol),
          protocolIndex[protocolname],
          jobkey,
          devices,
        );
        this._schedulerRegistry.addCronJob(jobkey, deviceReadJob);
        deviceReadJob.start();
      },
    );
    await redisPipeline.exec();

    // create jobs for device sample
    devicesConfig.map((device) => {
      if (
        device.devicetypeid !== DeviceType.PPC &&
        DATA_SAMPLE_MAP[device.devicedatasampletype]
      ) {
        const deivceSampleJob = this.createJobForDataSampleRead(
          DATA_SAMPLE_MAP[device.devicedatasampletype].cron,
          device,
        );
        this._schedulerRegistry.addCronJob(device.deviceid, deivceSampleJob);
        deivceSampleJob.start();
      }
    });
  }

  private createJobForDataRead = (
    cronpattern: string,
    protocol: PROTOCOL,
    indexId: number,
    jobkey: string,
    devices: IArmaxViewDataScrapperDevice[],
  ): CronJob<null, null> => {
    const job = new CronJob(cronpattern, async () => {
      this._messageQueueService.sendProtocolReadRequest(
        protocol,
        indexId,
        jobkey,
        devices,
      );
    });
    return job;
  };

  private createJobForDataSampleRead = (
    cronpattern: string,
    device: IArmaxViewDataScrapperDevice,
  ): CronJob<null, null> => {
    const job = new CronJob(cronpattern, async () => {
      this._messageQueueService.sendDataSampleRequest(device);
    });
    return job;
  };

  @Cron(CronExpression.EVERY_SECOND)
  sendRawDataRequest() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_RAW_COLLECT_TOPIC,
    );
  }

  @Cron(Config.cron.rawdataaggregator)
  sendDataSampleAggregatorRequest() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_RAW_AGGREGATOR_TOPIC,
    );
  }

  @Cron(Config.cron.backlogperseconddata)
  sendBacklogPerSecond() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_BACKLOG_PERSECOND_TOPIC,
    );
  }

  @Cron(Config.cron.backlogdata)
  sendBacklogPerMinute() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_BACKLOG_PERMINUTE_TOPIC,
    );
  }

  @Cron(Config.cron.backlognotificationdata)
  sendBacklogNotificationAlert() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_BACKLOG_NOTIFICATION_ALERT_TOPIC,
    );
  }

  @Cron(Config.cron.backlognotificationdata)
  sendBacklogNotificationEvent() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_BACKLOG_NOTIFICATION_EVENT_TOPIC,
    );
  }

  @Cron(Config.cron.datacleanup)
  sendDataCleanup() {
    this._messageQueueService.sendCommonRequest(
      Config.topics.DATA_CLEANUP_TOPIC,
    );
  }
}
