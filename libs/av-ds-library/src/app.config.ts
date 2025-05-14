import {
  AuditLogger as auditLogger,
  Logger as internalLogger,
} from '@armax_cloud/yoko-libraries';

import dotenv from 'dotenv';
import winston from 'winston';
import { ValidationSchema } from './validators/config.validator';

dotenv.config();
const { value: configvalues, error: valerrors } = ValidationSchema.prefs({
  errors: { label: 'key' },
}).validate(
  JSON.parse(
    process.env[
      process.env?.NODE_ENV === 'production'
        ? `AV_DS_CONFIG`
        : 'AV_DS_DEV_CONFIG'
    ] || '{}',
  ),
);
if (valerrors) {
  throw new Error(`Config validation error: ${valerrors.message}`);
}

export const Config = configvalues;

const buildLogger = (): winston.Logger => {
  return internalLogger.getlogger(
    Config.servername || '',
    Config.serverip || '',
    (process.env?.APP_NAME ?? Config.subdomain).toLowerCase(),
    Config.logger,
  );
};
const buildauditLogger = (): winston.Logger => {
  return auditLogger.getlogger(
    Config.servername || '',
    Config.serverip || '',
    (process.env?.APP_NAME ?? Config.subdomain).toLowerCase(),
    Config.logger,
  );
};

export const Logger = buildLogger();
export const AuditLogger = buildauditLogger();
