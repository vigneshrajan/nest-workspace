import { DataType } from '@armax_cloud/radiatics-models';
import { defaultData } from './util.service';
const bool = (data: Array<boolean | number>, offset: number) =>
  data[offset] === true || data[offset] === 1;

const signedInt16 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(2);
  if (littleendian) {
    buf.writeUInt16LE(data[offset]);
    return buf.readInt16LE(0);
  }
  buf.writeUInt16BE(data[offset]);
  return buf.readInt16BE(0);
};

const unsignedInt16 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(2);
  if (littleendian) {
    buf.writeUInt16LE(data[offset]);
    return buf.readUInt16LE(0);
  }
  buf.writeUInt16BE(data[offset]);
  return buf.readUInt16BE(0);
};

const signedInt32 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(4);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    return buf.readInt32LE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  return buf.readInt32BE(0);
};

const unsignedInt32 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(4);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    return buf.readUInt32LE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  return buf.readUInt32BE(0);
};

const signedInt64 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): bigint => {
  const buf: Buffer = Buffer.alloc(8);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    buf.writeUInt16LE(data[offset + 2], 4);
    buf.writeUInt16LE(data[offset + 3], 6);
    return buf.readBigInt64LE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  buf.writeUInt16BE(data[offset + 2], 4);
  buf.writeUInt16BE(data[offset + 3], 6);
  return buf.readBigInt64BE(0);
};

const unsignedInt64 = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): bigint => {
  const buf: Buffer = Buffer.alloc(8);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    buf.writeUInt16LE(data[offset + 2], 4);
    buf.writeUInt16LE(data[offset + 3], 6);
    return buf.readBigUInt64LE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  buf.writeUInt16BE(data[offset + 2], 4);
  buf.writeUInt16BE(data[offset + 3], 6);
  return buf.readBigUInt64BE(0);
};

const real = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(4);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    return buf.readFloatLE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  return buf.readFloatBE(0);
};

const double = (
  data: Array<number>,
  offset: number,
  littleendian: boolean,
): number => {
  const buf: Buffer = Buffer.alloc(8);
  if (littleendian) {
    buf.writeUInt16LE(data[offset], 0);
    buf.writeUInt16LE(data[offset + 1], 2);
    buf.writeUInt16LE(data[offset + 2], 4);
    buf.writeUInt16LE(data[offset + 3], 6);
    return buf.readDoubleLE(0);
  }
  buf.writeUInt16BE(data[offset], 0);
  buf.writeUInt16BE(data[offset + 1], 2);
  buf.writeUInt16BE(data[offset + 2], 4);
  buf.writeUInt16BE(data[offset + 3], 6);
  return buf.readDoubleBE(0);
};

const string = () => {
  throw new Error('not implemented');
};

export const modbusDataConvert = (
  datatype: number,
  data: Array<number | boolean>,
  offset: number,
  littleendian: boolean,
) => {
  const templittleendian = defaultData(littleendian, false) as boolean;
  switch (datatype) {
    case DataType.BOOL:
      return bool(data, offset);
    case DataType.SIGNEDINT16:
      return signedInt16(data as Array<number>, offset, templittleendian);
    case DataType.UNSIGNEDINT16:
      return unsignedInt16(data as Array<number>, offset, templittleendian);
    case DataType.SIGNEDINT32:
      return signedInt32(data as Array<number>, offset, templittleendian);
    case DataType.UNSIGNEDINT32:
      return unsignedInt32(data as Array<number>, offset, templittleendian);
    case DataType.REAL32:
      return real(data as Array<number>, offset, templittleendian);
    case DataType.SIGNEDINT64:
      return signedInt64(data as Array<number>, offset, templittleendian);
    case DataType.UNSIGNEDINT64:
      return unsignedInt64(data as Array<number>, offset, templittleendian);
    case DataType.DOUBLE64:
      return double(data as Array<number>, offset, templittleendian);
    case DataType.STRING:
      return string();
    default:
      throw new Error(`Invalid datatype ${datatype}`);
  }
};
