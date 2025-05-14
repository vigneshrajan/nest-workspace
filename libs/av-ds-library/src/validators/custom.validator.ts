import { CustomHelpers } from 'joi';
import { ObjectId } from 'mongodb';

export const ValidateObjectID =
  (name: string) => (value: string, helpers: CustomHelpers) => {
    const tempval = value.trim();
    return new ObjectId(tempval).toString() === tempval
      ? value
      : helpers.message({
          custom: `Invalid Object ${name}`,
        });
  };
