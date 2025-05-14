import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CustomForbiddenException, ValidationException } from '../models';
import { Config, Logger } from '../app.config';
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    // const request = ctx.getRequest();
    const logid = uuidv4();
    const isvalidationError = exception instanceof ValidationException;
    if (!isvalidationError) {
      Logger.debug('Exception', { exception: exception, logid });
    }
    if (exception instanceof CustomForbiddenException) {
      response
        .status((exception as CustomForbiddenException).getStatus())
        .json('invalid');
      return;
    }
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorresponse: {
      error: boolean;
      errormessage: string;
      data: boolean;
      stack?: string;
      logid?: string;
    } = {
      error: true,
      errormessage: response?.errormessage || exception.message,
      data: false,
    };
    if (Config.logger.debug && exception.stack && !isvalidationError) {
      errorresponse.stack = exception.stack;
      errorresponse.logid = logid;
    }
    response.status(status).json(errorresponse);
  }
}
