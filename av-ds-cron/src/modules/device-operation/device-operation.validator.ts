import { PROTOCOL } from '@armax_cloud/radiatics-models';
import { RequestValidator, ValidateObjectID } from '@library/av-ds-library';
import joi from 'joi';

export const DeviceOperationValidation: RequestValidator = {
  params: joi.object().keys({
    deviceid: joi.required().custom(ValidateObjectID('deviceid')),
    protocolid: joi
      .number()
      .valid(PROTOCOL.MODBUS, PROTOCOL.OPCUA)
      .required()
      .label('protocolid'),
  }),
  body: joi.object().keys({
    modbusmeta: joi
      .object()
      .when(joi.ref('...params.protocolid'), {
        switch: [
          {
            is: joi.valid(PROTOCOL.MODBUS),
            then: joi.object().keys({
              regaddress: joi
                .number()
                .required()
                .label('modbusmeta:regaddress'),
              datatype: joi.number().required().label('modbusmeta:datatype'),
              value: joi
                .alternatives()
                .try(joi.string(), joi.number(), joi.boolean())
                .required()
                .label('modbusmeta:value'),
              islittleendian: joi
                .bool()
                .default(false)
                .label('modbusmeta:islittleendian'),
            }),
          },
          {
            is: joi.exist(),
            then: joi.forbidden(),
          },
        ],
      })
      .label('modbusmeta'),
    opcuameta: joi
      .object()
      .when(joi.ref('...params.protocolid'), {
        switch: [
          {
            is: joi.valid(PROTOCOL.OPCUA),
            then: joi.object().keys({
              nodeid: joi.string().required().label('opcuameta:nodeid'),
              datatype: joi.number().required().label('opcuameta:datatype'),
              value: joi
                .alternatives()
                .try(joi.string(), joi.number(), joi.boolean())
                .required()
                .label('opcuameta:value'),
            }),
          },
          {
            is: joi.exist(),
            then: joi.forbidden(),
          },
        ],
      })
      .label('opcuameta'),
  }),
};
