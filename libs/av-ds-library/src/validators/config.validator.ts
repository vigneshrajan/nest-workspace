import {
  IArmaxViewAPIEndpointConfig,
  IArmaxViewDataScrappeOPCUAServerMeta,
  IArmaxViewDataScrappeOPCUAServerMetaUser,
  IArmaxViewDataScrapperAppPorts,
  IArmaxViewDataScrapperConfig,
  IArmaxViewDataScrapperCron,
  IArmaxViewDataScrapperInternalService,
  IArmaxViewDataScrapperTopics,
  IRabbitMQConfig,
} from '@armax_cloud/av-models';
import { address } from 'ip';
import Joi from 'joi';
import { hostname } from 'os';

const ValidationSchema = Joi.object<IArmaxViewDataScrapperConfig>()
  .keys({
    subdomain: Joi.string().required().description('subdomain'),
    blockip: Joi.string().ip().required().description('blockip'),
    serverip: Joi.string().ip().default(address()).description('serverip'),
    servername: Joi.string().default(hostname()).description('servername'),
    applicationname: Joi.string().default('').description('applicationname'),
    port: Joi.number().optional().description('port'),
    accessexpirationminutes: Joi.number().description(
      'accessexpirationminutes',
    ),
    refreshexpirationminutes: Joi.number().description(
      'refreshexpirationminutes',
    ),
    applicationsecret: Joi.string().required().description('applicationsecret'),
    logger: Joi.object().keys({
      debug: Joi.boolean().required().description('logger:debug'),
      connectionstring: Joi.string()
        .optional()
        .description('logger:connectionstring'),
      type: Joi.number().required().description('logger:type'),
    }),
    database: Joi.object().keys({
      connectionstring: Joi.string()
        .required()
        .description('database:connectionstring'),
    }),
    redis: Joi.object().keys({
      sentinel: Joi.boolean().required().description('redis:sentinel'),
      dbid: Joi.number().optional().default(1).description('redis:dbid'),
      host: Joi.when('sentinel', {
        is: false,
        then: Joi.object().keys({
          host: Joi.string().required().description('redis:host:host'),
          port: Joi.number().required().description('redis:host:port'),
        }),
      }),
      password: Joi.when('sentinel', {
        is: false,
        then: Joi.string().description('redis:password'),
      }),
      sentinelconfig: Joi.when('sentinel', {
        is: true,
        then: Joi.array()
          .required()
          .min(1)
          .items(
            Joi.object().keys({
              password: Joi.string().description(
                'redis:sentinelconfig:password',
              ),
              mastername: Joi.string()
                .required()
                .description('redis:sentinelconfig:mastername'),
              sentinelhost: Joi.object().keys({
                host: Joi.string()
                  .required()
                  .description('redis:sentinelconfig:host'),
                port: Joi.number()
                  .required()
                  .description('redis:sentinelconfig:port'),
              }),
            }),
          ),
      }),
    }),
    rabbitmq: Joi.object<IRabbitMQConfig>().keys({
      connectionstring: Joi.string()
        .required()
        .description('rabbitmq:connectionstring'),
    }),
    dataprocessendpoint: Joi.object<IArmaxViewAPIEndpointConfig>().keys({
      url: Joi.string().required().description('dataprocessendpoint:url'),
      jwtsecret: Joi.string()
        .required()
        .description('dataprocessendpoint:jwtsecret'),
    }),
    cron: Joi.object<IArmaxViewDataScrapperCron>().keys({
      backlogdata: Joi.string().required().description('cron:backlogdata'),
      backlognotificationdata: Joi.string()
        .required()
        .description('cron:backlognotificationdata'),
      backlogperseconddata: Joi.string()
        .required()
        .description('cron:backlogperseconddata'),
      datacleanup: Joi.string().required().description('cron:datacleanup'),
      perseconddataretentionindays: Joi.number()
        .optional()
        .description('cron:perseconddataretentionindays'),
      ppcdatabatchpush: Joi.number()
        .optional()
        .description('cron:ppcdatabatchpush'),
      rawdataaggregator: Joi.string()
        .required()
        .description('cron:rawdataaggregator'),
      rawdatarequest: Joi.string()
        .required()
        .description('cron:rawdatarequest'),
      scadadatabatchpush: Joi.number()
        .optional()
        .description('cron:scadadatabatchpush'),
      scadadataretensionindays: Joi.number()
        .optional()
        .description('cron:scadadataretensionindays'),
    }),
    killprocessonerror: Joi.boolean()
      .optional()
      .description('killprocessonerror'),
    topics: Joi.object<IArmaxViewDataScrapperTopics>().keys({
      DATA_PROTOCOL_COLLECT_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_PROTOCOL_COLLECT_TOPIC'),
      DATA_RAW_COLLECT_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_RAW_COLLECT_TOPIC'),
      DATA_RAW_AGGREGATOR_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_RAW_AGGREGATOR_TOPIC'),
      DATA_RAW_SAMPLE_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_RAW_SAMPLE_TOPIC'),
      DATA_RAW_NOTIFICATION_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_RAW_NOTIFICATION_TOPIC'),
      DATA_BACKLOG_PERSECOND_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_BACKLOG_PERSECOND_TOPIC'),
      DATA_BACKLOG_PERMINUTE_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_BACKLOG_PERMINUTE_TOPIC'),

      DATA_BACKLOG_NOTIFICATION_ALERT_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_BACKLOG_NOTIFICATION_ALERT_TOPIC'),
      DATA_BACKLOG_NOTIFICATION_EVENT_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_BACKLOG_NOTIFICATION_EVENT_TOPIC'),
      DATA_CLEANUP_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_CLEANUP_TOPIC'),
      KILL_PROCESS_TOPIC: Joi.string()
        .required()
        .description('topics:KILL_PROCESS_TOPIC'),
      DATA_RAW_LATEST_TOPIC: Joi.string()
        .required()
        .description('topics:DATA_RAW_LATEST_TOPIC'),
    }),
    protocolinstances: Joi.number().required().description('protocolinstances'),
    instanceid: Joi.number()
      .default(process.env.instanceid ?? 1)
      .description('instanceid'),
    applicationports: Joi.object<IArmaxViewDataScrapperAppPorts>().keys({
      cronport: Joi.number()
        .port()
        .required()
        .description('applicationports:cronport'),
      rawdataport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:rawdataport'),
      notificationengineport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:notificationengineport'),
      postmanport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:postmanport'),
      deviceprotocolsport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:deviceprotocolsport'),
      democracyport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:democracyport'),
      opcuaserverport: Joi.number()
        .port()
        .required()
        .description('applicationPorts:opcuaserverport'),
    }),
    internalservices: Joi.object<IArmaxViewDataScrapperInternalService>()
      .keys({
        opcuaserver: Joi.object<IArmaxViewDataScrappeOPCUAServerMeta>()
          .keys({
            enabled: Joi.boolean()
              .required()
              .description('internalservices:opcuaserver:enabled'),
            serverport: Joi.number()
              .port()
              .required()
              .description('internalservices:opcuaserver:serverport'),
            allowanonymous: Joi.boolean()
              .required()
              .description('internalservices:opcuaserver:allowanonymous'),
            userlist: Joi.any()
              .when('allowanonymous', {
                is: false,
                then: Joi.array().items(
                  Joi.object<IArmaxViewDataScrappeOPCUAServerMetaUser>().keys({
                    username: Joi.string()
                      .required()
                      .description(
                        'internalservices:opcuaserver:userlist:username',
                      ),
                    password: Joi.string()
                      .required()
                      .description(
                        'internalservices:opcuaserver:userlist:password',
                      ),
                  }),
                ),
                otherwise: Joi.optional(),
              })
              .description('internalservices:opcuaserver:userlist'),
          })
          .description('internalservices:opcuaserver'),
      })
      .description('internalservices'),
  })
  .unknown(true);

export { ValidationSchema };
