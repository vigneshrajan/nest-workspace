import {
  ArmaxViewDataSampleTypes,
  ArmaxViewProducts,
  IArmaxViewPlantMeta,
} from '@armax_cloud/av-models';
import {
  AggregateType,
  BlockType,
  ComparisionType,
  DataType,
  DeviceType,
  ModbusFunctionCode,
  NotificationType,
  OPCUAMessageSecurityMode,
  OPCUASecurityPolicy,
  PROTOCOL,
  PlantType,
  Severity,
} from '@armax_cloud/radiatics-models';

import {
  AddNotificationRequest,
  AddParameteRequest,
  AddParameterMetaRequest,
  AddParameterModbusMetaRequest,
  AddParameterOPCUAMetaRequest,
  AddParameterSNMPMetaRequest,
  BlockAddRequest,
  ConfigRequest,
  DeviceAddRequest,
  DeviceMetaAddRequest,
  DeviceModbusAddRequest,
  DeviceOPCUAAddRequest,
  DeviceStausUpdateRequest,
  PlantConfig,
  PlantStatusRequest,
  RequestValidator,
  StatusRequest,
  TimezoneBase,
} from '@library/av-ds-library/models';
import joi from 'joi';

const productValidation = joi
  .array()
  .items(
    joi
      .string()
      .valid(
        ArmaxViewProducts.SCADA,
        ArmaxViewProducts.PPC,
        ArmaxViewProducts.TRACKER,
      )
      .required(),
  );

export const ConfigValidation: RequestValidator = {
  body: joi.object<ConfigRequest>().keys({
    plantid: joi.string().required().label('plantid'),
    plant: joi
      .object<PlantConfig>()
      .keys({
        plantid: joi.string().required().label('plant:plantid'),
        organizationid: joi.string().required().label('plant:organizationid'),
        plantname: joi.string().required().label('plant:plantname'),
        plantidentifier: joi.string().required().label('plant:plantidentifier'),
        planttype: joi
          .number()
          .valid(PlantType.SOLAR, PlantType.WIND, PlantType.HYBRID)
          .required()
          .label('plant:planttype'),
        plantstatus: joi
          .object<PlantStatusRequest>()
          .keys({
            disable: joi
              .boolean()
              .default(false)
              .label('plant:plantstatus:disable'),
            hidden: joi
              .boolean()
              .default(false)
              .label('plant:plantstatus:hidden'),
          })
          .required()
          .label('plant:plantstatus'),
        planttimezone: joi
          .object<TimezoneBase>()
          .keys({
            name: joi.string().required().label('plant:planttimezone:name'),
            utcOffset: joi
              .number()
              .required()
              .label('plant:planttimezone:utcOffset'),
            dstOffset: joi
              .number()
              .required()
              .label('plant:planttimezone:dstOffset'),
          })
          .label('plant:planttimezone'),
        versionid: joi.string().optional().label('plant:versionid'),
        plantmeta: joi.object<IArmaxViewPlantMeta>().keys({
          plantproducts: productValidation.label('plantmeta:plantproducts'),
        }),
      })
      .label('plant'),
    devices: joi
      .array()
      .items(
        joi.object<DeviceAddRequest>().keys({
          deviceid: joi.string().required().label('devices:deviceid'),
          plantid: joi.string().required().label('devices:plantid'),
          devicename: joi.string().required().label('devices:devicename'),
          devicedisplayname: joi
            .string()
            .required()
            .label('devices:devicedisplayname'),
          devicecode: joi.number().required().label('devices:devicecode'),
          devicetypeid: joi
            .number()
            .valid(
              ...Object.values(DeviceType).filter(
                (devicetype) => typeof devicetype === 'number',
              ),
            )
            .required()
            .label('devices:devicetypeid'),
          deviceprotocol: joi
            .number()
            .valid(
              ...Object.values(PROTOCOL).filter(
                (protocol) => typeof protocol === 'number',
              ),
            )
            .required()
            .label('devices:deviceprotocol'),
          deviceport: joi.number().required().label('devices:deviceport'),
          devicedatafetchcron: joi
            .string()
            .required()
            .label('devices:devicedatafetchcron'),
          devicedatasampletype: joi
            .string()
            .valid(...Object.values(ArmaxViewDataSampleTypes))
            .required()
            .label('devices:devicedatasampletype'),
          devicestatus: joi
            .object<DeviceStausUpdateRequest>()
            .keys({
              disable: joi
                .boolean()
                .default(false)
                .label('devices:devicestatus:disable'),
              hidden: joi
                .boolean()
                .default(false)
                .label('devices:devicestatus:hidden'),
              communicationalarmenabled: joi
                .boolean()
                .default(false)
                .label('devices:devicestatus:communicationalarmenabled'),
              communicationeventenabled: joi
                .boolean()
                .default(false)
                .label('devices:devicestatus:communicationeventenabled'),
            })
            .required()
            .label('devices:devicestatus'),
          devicevirtual: joi
            .boolean()
            .default(false)
            .label('devices:devicevirtual'),
          devicevirtualfunction: joi.any().when('devicevirtual', {
            is: true,
            then: joi.string().label('devices:devicevirtualfunction'),
            otherwise: joi.optional().allow(null),
          }),
          availablesockets: joi
            .number()
            .default(1)
            .label('devices:availablesockets'),
          blockid: joi.string().required().label('devices:blockid'),
          blocktype: joi
            .number()
            .valid(
              ...Object.values(BlockType).filter(
                (blocktype) => typeof blocktype === 'number',
              ),
            )
            .required()
            .label('devices:blocktype'),
          versionid: joi.string().optional().label('devices:versionid'),
          devicemeta: joi
            .object<DeviceMetaAddRequest>()
            .keys({
              modbus: joi
                .object<DeviceModbusAddRequest>()
                .keys({
                  unitid: joi
                    .number()
                    .min(1)
                    .max(255)
                    .required()
                    .label('devices:devicemeta:modbus:unitid'),
                  timeout: joi
                    .number()
                    .default(2000)
                    .label('devices:devicemeta:modbus:timeout'),
                })
                .optional()
                .label('devices:devicemeta:modbus'),
              opcua: joi
                .object<DeviceOPCUAAddRequest>()
                .keys({
                  endpoint: joi
                    .string()
                    .optional()
                    .label('devices:devicemeta:opcua:endpoint'),
                  maxreadrecords: joi
                    .number()
                    .default(1000)
                    .label('devices:devicemeta:opcua:maxreadrecords'),
                  securitymode: joi
                    .number()
                    .optional()
                    .valid(
                      ...Object.values(OPCUAMessageSecurityMode).filter(
                        (secutityMode) => typeof secutityMode === 'number',
                      ),
                    )
                    .label('devices:devicemeta:opcua:securitymode'),
                  securitypolicy: joi
                    .string()
                    .optional()
                    .valid(...Object.values(OPCUASecurityPolicy))
                    .label('devices:devicemeta:opcua:securitypolicy'),
                  username: joi
                    .string()
                    .optional()
                    .label('devices:devicemeta:opcua:username'),
                  password: joi
                    .string()
                    .optional()
                    .label('devices:devicemeta:opcua:password'),
                  privatekey: joi
                    .string()
                    .optional()
                    .label('devices:devicemeta:opcua:privatekey'),
                  certificate: joi
                    .string()
                    .optional()
                    .label('devices:devicemeta:opcua:certificate'),
                })
                .optional()
                .label('devices:devicemeta:opcua'),
              deviceproducts: productValidation.label(
                'devices:devicemeta:deviceproducts',
              ),
              othermeta: joi
                .object()
                .pattern(
                  joi.string(),
                  joi.object().keys({
                    value: joi
                      .string()
                      .required()
                      .label('devices:devicemeta:othermeta:value'),
                    valuedatatype: joi
                      .number()
                      .required()
                      .label('devices:devicemeta:othermeta:valuedatatype'),
                    audit: joi
                      .object()
                      .keys({
                        userid: joi
                          .string()
                          .optional()
                          .label('devices:devicemeta:othermeta:audit:userid'),
                        username: joi
                          .string()
                          .required()
                          .label('devices:devicemeta:othermeta:audit:username'),
                        useremail: joi
                          .string()
                          .required()
                          .label(
                            'devices:devicemeta:othermeta:audit:useremail',
                          ),
                        ipaddress: joi
                          .string()
                          .optional()
                          .label(
                            'devices:devicemeta:othermeta:audit:ipaddress',
                          ),
                        auditdate: joi
                          .string()
                          .required()
                          .label(
                            'devices:devicemeta:othermeta:audit:auditdate',
                          ),
                        meta: joi
                          .any()
                          .optional()
                          .label('devices:devicemeta:othermeta:audit:meta'),
                      })
                      .required()
                      .label('devices:devicemeta:othermeta:audit'),
                  }),
                )
                .optional()
                .label('devices:devicemeta:othermeta'),
              invertermeta: joi
                .any()
                .when('devicetypeid', {
                  is: DeviceType.INV,
                  then: joi.object().keys({
                    istracker: joi
                      .boolean()
                      .optional()
                      .default(false)
                      .description('devices:devicemeta:invertermeta:istracker'),
                    wmsdevices: joi
                      .array()
                      .items(joi.string())
                      .optional()
                      .default([])
                      .description(
                        'devices:devicemeta:invertermeta:wmsdevices',
                      ),
                    accapacity: joi
                      .number()
                      .required()
                      .description(
                        'devices:devicemeta:invertermeta:accapacity',
                      ),
                    dccapacity: joi
                      .number()
                      .required()
                      .description(
                        'devices:devicemeta:invertermeta:dccapacity',
                      ),
                    connectedmodules: joi
                      .number()
                      .optional()
                      .allow(null)
                      .description(
                        'devices:devicemeta:invertermeta:connectedmodules',
                      ),
                  }),
                  otherwise: joi.optional(),
                })
                .description('devices:devicemeta:invertermeta'),
              inverterunitmeta: joi
                .any()
                .when('devicetypeid', {
                  is: DeviceType.INVU,
                  then: joi.object().keys({
                    istracker: joi
                      .boolean()
                      .optional()
                      .default(false)
                      .description(
                        'devices:devicemeta:inverterunitmeta:istracker',
                      ),
                    wmsdevices: joi
                      .array()
                      .items(joi.string())
                      .optional()
                      .default([])
                      .description(
                        'devices:devicemeta:inverterunitmeta:wmsdevices',
                      ),
                    accapacity: joi
                      .number()
                      .required()
                      .description(
                        'devices:devicemeta:inverterunitmeta:accapacity',
                      ),
                    dccapacity: joi
                      .number()
                      .required()
                      .description(
                        'devices:devicemeta:inverterunitmeta:dccapacity',
                      ),
                    connectedmodules: joi
                      .number()
                      .optional()
                      .allow(null)
                      .description(
                        'devices:devicemeta:inverterunitmeta:connectedmodules',
                      ),
                  }),
                  otherwise: joi.optional(),
                })
                .description('devices:devicemeta:inverterunitmeta'),
            })
            .required()
            .label('devices:devicemeta'),
          parameters: joi
            .array<AddParameteRequest[]>()
            .items(
              joi.object<AddParameteRequest>().keys({
                _id: joi.string().required().label('devices:parameters:_id'),
                parametername: joi
                  .string()
                  .required()
                  .label('devices:parameters:parametername'),
                parameterdisplayname: joi
                  .string()
                  .required()
                  .label('devices:parameters:parameterdisplayname'),
                parameterdatatype: joi
                  .number()
                  .valid(
                    ...Object.values(DataType).filter(
                      (datatype) => typeof datatype === 'number',
                    ),
                  )
                  .required()
                  .label('devices:parameters:parameterdatatype'),
                parametermin: joi
                  .number()
                  .optional()
                  .allow(null)
                  .label('devices:parameters:parametermin'),
                parametermax: joi
                  .number()
                  .optional()
                  .allow(null)
                  .label('devices:parameters:parametermax'),
                parametervalueoffset: joi
                  .number()
                  .optional()
                  .allow(null)
                  .label('devices:parameters:parametervalueoffset'),
                parameterread: joi
                  .boolean()
                  .default(true)
                  .label('devices:parameters:parameterread'),
                parameterwrite: joi
                  .boolean()
                  .default(false)
                  .label('devices:parameters:parameterwrite'),
                parametermeta: joi
                  .object<AddParameterMetaRequest>()
                  .keys({
                    modbus: joi
                      .object<AddParameterModbusMetaRequest>()
                      .keys({
                        registeraddress: joi
                          .number()
                          .required()
                          .label(
                            'devices:parameters:parametermeta:modbus:registeraddress',
                          ),
                        registerlength: joi
                          .number()
                          .min(1)
                          .max(4)
                          .required()
                          .label(
                            'devices:parameters:parametermeta:modbus:registerlength',
                          ),
                        littleendian: joi
                          .boolean()
                          .default(false)
                          .label(
                            'devices:parameters:parametermeta:modbus:littleendian',
                          ),
                        functioncode: joi
                          .number()
                          .valid(
                            ...Object.values(ModbusFunctionCode).filter(
                              (fc) => typeof fc === 'number',
                            ),
                          )
                          .label(
                            'devices:parameters:parametermeta:modbus:functioncode',
                          ),
                        group: joi
                          .string()
                          .required()
                          .label(
                            'devices:parameters:parametermeta:modbus:group',
                          ),
                      })
                      .optional()
                      .label('devices:parameters:parametermeta:modbus'),
                    opcua: joi
                      .object<AddParameterOPCUAMetaRequest>()
                      .keys({
                        nodeid: joi
                          .string()
                          .required()
                          .label(
                            'devices:parameters:parametermeta:opcua:nodeid',
                          ),
                      })
                      .optional()
                      .label('devices:parameters:parametermeta:opcua'),
                    snmp: joi
                      .object<AddParameterSNMPMetaRequest>()
                      .keys({
                        oid: joi
                          .string()
                          .required()
                          .label('devices:parameters:parametermeta:snmp:oid'),
                      })
                      .optional()
                      .label('devices:parameters:parametermeta:opcua'),
                    parameterproducts: productValidation.label(
                      'devices:parameters:parametermeta:parameterproducts',
                    ),
                  })
                  .label('devices:parameters:parametermeta'),
                parameterstatus: joi
                  .object<StatusRequest>()
                  .keys({
                    disable: joi
                      .boolean()
                      .default(false)
                      .label('devices:parameters:parameterstatus:disable'),
                    hidden: joi
                      .boolean()
                      .default(false)
                      .label('devices:parameters:parameterstatus:hidden'),
                  })
                  .label('devices:parameters:parameterstatus'),
                parameterfunction: joi
                  .string()
                  .optional()
                  .label('devices:parameters:parameterfunction'),
                parametervirtual: joi
                  .boolean()
                  .default(false)
                  .label('devices:parameters:parametervirtual'),
                parametervirtualfunction: joi.any().when('parametervirtual', {
                  is: true,
                  then: joi
                    .string()
                    .label('devices:parameters:parametervirtualfunction'),
                  otherwise: joi.optional().allow(null),
                }),

                parameterscalingfactor: joi
                  .number()
                  .optional()
                  .label('devices:parameters:parameterscalingfactor'),
                parameteraggregatetype: joi
                  .number()
                  .valid(
                    ...Object.values(AggregateType).filter(
                      (datatype) => typeof datatype === 'number',
                    ),
                  )
                  .required()
                  .label('devices:parameters:parameteraggregatetype'),
                parameterhold: joi
                  .boolean()
                  .default(true)
                  .label('devices:parameters:parameterhold'),
                parameterdisplay: joi
                  .boolean()
                  .default(true)
                  .label('devices:parameters:parameterdisplay'),
                notifications: joi
                  .array()
                  .optional()
                  .items(
                    joi.object<AddNotificationRequest>().keys({
                      _id: joi
                        .string()
                        .required()
                        .label('devices:parameters:notifications:_id'),
                      notificationname: joi
                        .string()
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationname',
                        ),
                      notificationtype: joi
                        .number()
                        .valid(
                          ...Object.values(NotificationType).filter(
                            (datatype) => typeof datatype === 'number',
                          ),
                        )
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationtype',
                        ),
                      notificationcomparisiontype: joi
                        .number()
                        .valid(
                          ...Object.values(ComparisionType).filter(
                            (datatype) => typeof datatype === 'number',
                          ),
                        )
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationcomparisiontype',
                        ),
                      notificationseverity: joi
                        .number()
                        .valid(
                          ...Object.values(Severity).filter(
                            (datatype) => typeof datatype === 'number',
                          ),
                        )
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationseverity',
                        ),
                      notificationvalue: joi
                        .alternatives(joi.number(), joi.boolean(), joi.string())
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationvalue',
                        ),
                      notificationconvert: joi
                        .boolean()
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationconvert',
                        ),
                      notificationbitposition: joi
                        .number()
                        .optional()
                        .label(
                          'devices:parameters:notifications:notificationbitposition',
                        ),
                      notificationdefaultvalue: joi
                        .alternatives(joi.number(), joi.boolean(), joi.string())
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationdefaultvalue',
                        ),
                      notificationvirtual: joi
                        .boolean()
                        .default(false)
                        .label(
                          'devices:parameters:notifications:notificationvirtual',
                        ),
                      notificationvirtualfunction: joi
                        .string()
                        .optional()
                        .label(
                          'devices:parameters:notifications:notificationvirtualfunction',
                        ),
                      notificationstatus: joi
                        .object<StatusRequest>()
                        .keys({
                          disable: joi
                            .boolean()
                            .default(false)
                            .label(
                              'devices:parameters:notifications:notificationstatus:disable',
                            ),
                          hidden: joi
                            .boolean()
                            .default(false)
                            .label(
                              'devices:parameters:notifications:notificationstatus:hidden',
                            ),
                        })
                        .label(
                          'devices:parameters:notifications:notificationstatus',
                        ),
                      notificationminimumduration: joi
                        .number()
                        .optional()
                        .allow(null)
                        .label(
                          'devices:parameters:notifications:notificationminimumduration',
                        ),
                      notificationdisplayname: joi
                        .string()
                        .required()
                        .label(
                          'devices:parameters:notifications:notificationdisplayname',
                        ),
                    }),
                  )
                  .label('devices:parameters:notifications'),
              }),
            )
            .label('devices:parameters'),
          deviceips: joi
            .array()
            .items(
              joi
                .string()
                .ip({
                  version: ['ipv4'],
                })
                .required(),
            )
            .optional()
            .label('devices:deviceips'),
        }),
      )
      .prefs({ errors: { label: 'path' } })
      .label('devices'),
    blocks: joi
      .array()
      .items(
        joi.object<BlockAddRequest>().keys({
          blockid: joi.string().required().label('blocks:blockid'),
          plantid: joi.string().required().label('blocks:plantid'),
          blockname: joi.string().required().label('blocks:blockname'),
          blockdisplayname: joi
            .string()
            .required()
            .label('blocks:blockdisplayname'),
          blockips: joi
            .array()
            .items(
              joi
                .string()
                .ip({
                  version: ['ipv4'],
                })
                .required(),
            )
            .optional()
            .label('blocks:blockips'),
          blocksortorder: joi
            .number()
            .optional()
            .label('blocks:blocksortorder'),
          blockvirtual: joi.boolean().optional().label('blocks:blockvirtual'),
          blockvirtualfunction: joi
            .string()
            .allow(null)
            .optional()
            .label('blocks:blockvirtualfunction'),
          blockstatus: joi
            .object<DeviceStausUpdateRequest>()
            .keys({
              disable: joi
                .boolean()
                .default(false)
                .label('blocks:blockstatus:disable'),
              hidden: joi
                .boolean()
                .default(false)
                .label('blocks:blockstatus:hidden'),
            })
            .required()
            .label('blocks:blockstatus'),
          blocktype: joi
            .number()
            .valid(
              ...Object.values(BlockType).filter(
                (blocktype) => typeof blocktype === 'number',
              ),
            )
            .required()
            .label('blocks:blocktype'),
        }),
      )
      .prefs({ errors: { label: 'path' } })
      .label('blocks'),
  }),
};
