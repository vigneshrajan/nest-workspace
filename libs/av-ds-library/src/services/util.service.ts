import { IArmaxViewParameter } from '@armax_cloud/av-models';

import { addMinutes } from 'date-fns';
import { Connection } from 'mongoose';
import { sign } from 'jsonwebtoken';
import { ComparisionType, DataType } from '@armax_cloud/radiatics-models';

export const generateRandomString = (length: number = 8) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  return Array.from({ length })
    .map(() => characters.charAt(Math.floor(Math.random() * charactersLength)))
    .join('');
};

export const parameterScaling = (
  parameter: IArmaxViewParameter,
  parametervalue: number,
) => {
  // replace min value
  if (parameter.parametermin !== undefined && parameter.parametermin !== null) {
    parametervalue =
      parametervalue < parameter.parametermin
        ? parameter.parametermin
        : parametervalue;
  }

  // replace max value
  if (parameter.parametermax !== undefined && parameter.parametermax !== null) {
    parametervalue =
      parametervalue > parameter.parametermax
        ? parameter.parametermax
        : parametervalue;
  }

  // parameter scalling
  if (
    parameter.parameterscalingfactor !== undefined &&
    parameter.parameterscalingfactor !== null &&
    parameter.parameterscalingfactor !== 0
  ) {
    parametervalue = parametervalue * parameter.parameterscalingfactor;
  }

  // parameter offset
  if (
    parameter.parametervalueoffset !== undefined &&
    parameter.parametervalueoffset !== null &&
    parameter.parametervalueoffset !== 0
  ) {
    parametervalue = parametervalue + parameter.parametervalueoffset;
  }

  return valueRoundOff(parametervalue);
};

export const FunctionBuilder = (
  dbconnection: Connection | null,
  libraries: { [k: string]: unknown },
  modules: { [k: string]: unknown },
  parameters: { [k: string]: unknown },
  functionString: string,
  otherdata: { [k: string]: unknown } = {},
) =>
  new Promise(async (resolve, reject) => {
    try {
      const customfunction = new Function(`return ${functionString}`)();

      const result = await customfunction(
        dbconnection,
        libraries,
        modules,
        parameters,
        otherdata,
      );

      if (typeof result === 'boolean' || typeof result === 'number') {
        resolve(result);
      } else {
        reject(new Error('Function did not return a boolean or a number.'));
      }
    } catch (err) {
      reject(err);
    }
  });

export const isNotNull = (data: unknown) => data !== undefined && data !== null;
export const isEmptyString = (data: string) =>
  !isNotNull(data) || !data.trim().length;

export const defaultData = (
  data: number | boolean | string,
  defaultdata: number | boolean | string,
): number | boolean | string => {
  return data ?? defaultdata;
};

export const generateToken = (
  data: { [key: string]: any },
  secret: string,
  expirationminutes: number,
) => {
  const newexpiry = addMinutes(new Date(), expirationminutes);
  const payload = {
    ...data,
    iat: new Date().getTime() / 1000,
    exp: new Date(newexpiry).getTime() / 1000,
  };
  return sign(payload, secret);
};

export const dataComparison = (
  lhs: any,
  rhs: any,
  comparionType: ComparisionType,
  dataType: DataType,
): boolean => {
  let lhsValue;
  let rhsVaue;

  switch (dataType) {
    case DataType.DOUBLE64:
    case DataType.REAL32: {
      lhsValue = parseFloat(lhs);
      rhsVaue = parseFloat(rhs);
      break;
    }
    case DataType.SIGNEDINT16:
    case DataType.SIGNEDINT32:
    case DataType.SIGNEDINT64:
    case DataType.UNSIGNEDINT16:
    case DataType.UNSIGNEDINT32:
    case DataType.UNSIGNEDINT64: {
      lhsValue = parseInt(lhs);
      rhsVaue = parseInt(rhs);
      break;
    }
    case DataType.BOOL: {
      lhsValue = Boolean(lhs);
      rhsVaue = Boolean(rhs);
      break;
    }
    default: {
      lhsValue = lhs;
      rhsVaue = rhs;
      break;
    }
  }

  if (comparionType === ComparisionType.EQUAL) {
    return lhsValue === rhsVaue;
  } else if (comparionType === ComparisionType.GREATER) {
    return lhsValue > rhsVaue;
  } else if (comparionType === ComparisionType.GREATEREQUAL) {
    return lhsValue >= rhsVaue;
  } else if (comparionType === ComparisionType.LESSER) {
    return lhsValue < rhsVaue;
  } else if (comparionType === ComparisionType.LESSEREQUAL) {
    return lhsValue <= rhsVaue;
  } else if (comparionType === ComparisionType.NOTEQUAL) {
    return lhsValue !== rhsVaue;
  } else {
    return false;
  }
};

export const valueRoundOff = (value: number, decimal: number = 3) =>
  parseFloat(value.toFixed(decimal));
