import _ from 'lodash'
import { getEnvVariable, env } from "@modules/env";

export interface EbgMysqlDriverConfig {
  enableBinaryLogListener?: Boolean;
  provider?: string;
  connection?: object
}

export interface EbgMysqlConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  database: string;
  dialect?: string;
  dialectModule?: string;
}

export const defaultMysqlSettings: EbgMysqlConfig = {
  host: 'localhost',
  username: 'ebg',
  password: '',
  port: 3306,
  database: 'ebg',
  dialect: 'mysql'
}

export const mysqlSettings = {
  ...defaultMysqlSettings,

  host: _.get(env, 'MYSQL_HOST', defaultMysqlSettings.host),
  username: _.get(env, 'MYSQL_USER', defaultMysqlSettings.username),
  password: _.get(env, 'MYSQL_PASS', defaultMysqlSettings.password),
  port: Number(_.get(env, 'MYSQL_PORT', defaultMysqlSettings.port)),
  database: _.get(env, 'MYSQL_DATABASE', defaultMysqlSettings.database),
}

export const isMysqlEnabled = true;
export const isListenerEnabled = true;

class EbgMysql {

}