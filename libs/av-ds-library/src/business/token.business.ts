/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { sign, verify } from 'jsonwebtoken';
import { Config } from '../app.config';

@Injectable()
export class TokenBusiness {
  generateToken = (machineid?: string) => {
    const newexpiry = addMinutes(new Date(), Config.accessexpirationminutes);
    const payload = {
      machineid,
      iat: new Date().getTime() / 1000,
      exp: new Date(newexpiry).getTime() / 1000,
    };
    return sign(payload, Config.applicationsecret);
  };

  verifyTokenBody = (token: string): Promise<any> =>
    new Promise((resolve) => {
      verify(token, Config.applicationsecret, (err: any, decoded: any) => {
        if (err || !decoded) {
          resolve(null);
        } else {
          resolve(decoded);
        }
      });
    });
}
