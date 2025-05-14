import { Module } from '@nestjs/common';
import { Config } from '../../app.config';
import { IRedisService } from '@armax_cloud/radiatics-libraries';
import { RedisDataService } from './redis.data.service';
@Module({
  providers: [
    { provide: 'REDISCONFIG', useValue: Config.redis },
    IRedisService,
    RedisDataService,
  ],
  exports: [IRedisService, RedisDataService],
})
export class RedisModule {}
