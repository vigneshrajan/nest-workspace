import { RequestValidator } from '@library/av-ds-library';
import joi from 'joi';

export const ProtocolDataValidation: RequestValidator = {
  body: joi.object().keys({
    timestamp: joi.number().label('timestamp'),
    data: joi
      .object()
      .pattern(
        joi.string(),
        joi.object().keys({
          timestamp: joi.number().label('timestamp'),
          deviceid: joi.string().required().label('deviceid'),
          deviceip: joi.string().required().label('deviceip'),
          parameters: joi
            .object()
            .pattern(
              joi.string(),
              joi
                .alternatives()
                .try(joi.string(), joi.number(), joi.boolean())
                .allow(null),
            )
            .required()
            .label('parameters'),
          parametersmeta: joi
            .object()
            .pattern(
              joi.string(),
              joi
                .object()
                .keys({
                  timestamp: joi
                    .number()
                    .required()
                    .label('parametersmeta:{lable}:timestamp'),
                  quality: joi
                    .boolean()
                    .optional()
                    .label('parametersmeta:{lable}:quality'),
                })
                .prefs({ errors: { label: 'path' } }),
            )
            .required()
            .label('parametersmeta'),
        }),
      )
      .required()
      .label('data'),
  }),
};
