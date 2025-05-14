import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import * as appConfig from '../app.config';
import { IArmaxViewDataScrapperConfig } from '@armax_cloud/av-models';
import winston from 'winston';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  Config: IArmaxViewDataScrapperConfig;
  Logger: winston.Logger;
  AuditLogger: winston.Logger;
  constructor() {}
  onApplicationBootstrap() {
    this.Config = appConfig.Config;
    this.Logger = appConfig.Logger;
    this.AuditLogger = appConfig.AuditLogger;
  }
}
