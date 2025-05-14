import { LoggerService } from '@armax_cloud/radiatics-libraries';
import { AuditLogger } from '@armax_cloud/yoko-libraries';
import { Logger, Module } from '@nestjs/common';

@Module({
  providers: [
    { provide: 'AUDITLOGGER', useValue: Logger },
    { provide: 'APPLOGGER', useValue: AuditLogger },
    LoggerService,
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
