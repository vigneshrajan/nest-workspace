import { Injectable, Scope } from '@nestjs/common';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Config } from '../../app.config';
import { MODULENAME, PROJECTNAME } from '../../app.constants';

@Injectable({ scope: Scope.DEFAULT })
export class DatabaseConfigService implements MongooseOptionsFactory {
  createMongooseOptions(): MongooseModuleOptions {
    return {
      appName: `${PROJECTNAME}_${MODULENAME}`,
      dbName: `${PROJECTNAME}_${Config.subdomain}_block`.toLowerCase(),
      uri: `${Config.database.connectionstring}`,
    };
  }
}
