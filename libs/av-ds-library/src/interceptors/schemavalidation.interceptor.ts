import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import joi from 'joi';
import { pick } from 'lodash';
import { Observable } from 'rxjs';
import { RequestValidator, ValidationException } from '../models';

@Injectable()
export class SchemaValidationInterceptor implements NestInterceptor {
  constructor(private schema: RequestValidator) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const validSchema = pick(this.schema, [
      'params',
      'query',
      'body',
      'headers',
    ]);
    const object = pick(request, Object.keys(validSchema));
    const { error } = joi
      .object()n
      .keys({ ...this.schema })
      .prefs({ errors: { label: 'key' } })
      .validate(object);
    if (error) {
      const errorMessage = error.details
        .map((details: { message: string }) => details.message)
        .join(', ');
      throw new ValidationException(errorMessage);
    }
    return next.handle();
  }
}
