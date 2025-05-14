import { LoggerService } from '@armax_cloud/radiatics-libraries';
import {
  AuditLogger,
  Config,
  Logger,
  GlobalExceptionFilter,
} from '@library/av-ds-library';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { set } from 'mongoose';
import { APPNAME } from './av-ds-rawdata.constants';
import { AvDsRawdataModule } from './av-ds-rawdata.module';
import { version } from '../../../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AvDsRawdataModule);
  const logger = new LoggerService(AuditLogger, Logger);
  set('debug', Config.logger.debug);

  if (process.env?.NODE_ENV !== 'production') {
    // documentation
    const config = new DocumentBuilder()
      .setTitle(APPNAME)
      .setDescription(`${APPNAME} SERVICE`)
      .setVersion(version)
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // cors & helmet
  app.enableCors();
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useLogger(logger);
  app.use(json({ limit: '10mb' }));

  await app.startAllMicroservices();
  await app.listen(Config.applicationports.rawdataport);
  Logger.info(`Application is running on: ${await app.getUrl()}`);

  const exitHandler = async () => {
    if (app) {
      await app.close();
      Logger.info('Server closed');
      process.exit(1);
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error: unknown) => {
    Logger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);
  // logger.log('SIGTERM received');
  process.on('SIGTERM', () => {
    if (app) {
      app.close();
    }
  });
}
bootstrap();
