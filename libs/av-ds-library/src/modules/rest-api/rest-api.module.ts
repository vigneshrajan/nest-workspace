import { Module } from '@nestjs/common';
import { RestApiService } from './rest-api.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [RestApiService],
  exports: [HttpModule, RestApiService],
})
export class RestApiModule {}
