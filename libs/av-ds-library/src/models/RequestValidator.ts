import { ObjectSchema } from 'joi';

export class RequestValidator {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
  headers?: ObjectSchema;
}
