import _ from "lodash";
import { env } from "@modules/env";
import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool, Pool } from "mysql2";
import { createListener } from "./listener";
import { executeRawQuery } from "./methods";

// @todo do a check if this file exists. this may break installation if src/config is not using mysql
// Must have this if you want to run this.
// import { DB } from "@src/models/mysql.defines"

// type of a table id
export type EbgMysqlIdType = string | number | symbol | null;

///////

export type EbgMysqlFieldType = number | string | symbol | null;
export type EbgComparisonOperators = {
  $gte?: EbgMysqlFieldType;
  $gt?: EbgMysqlFieldType;
  $lte?: EbgMysqlFieldType;
  $lt?: EbgMysqlFieldType;
  $in?: EbgMysqlFieldType[];
  $ne?: EbgMysqlFieldType;
  $like?: string;
  $not?: EbgMysqlFieldType | EbgComparisonOperators;
};

export type EbgFieldCondition = EbgMysqlFieldType | EbgComparisonOperators;

export type EbgLogicalOperators = {
  $and?: WhereParameters[] | undefined[];
  $or?: WhereParameters[] | undefined[];
  $not?: WhereParameters;
};

// export type WhereParameters = {
//   [field: string]: EbgFieldCondition | WhereParameters | undefined;
// } & EbgLogicalOperators;

///////////

export type MysqlFieldValue =
  | string
  | number
  | boolean
  | symbol
  | null
  | Date
  | undefined;

export interface ComparisonOperators {
  $eq?: MysqlFieldValue;
  $ne?: MysqlFieldValue;
  $gt?: number | Date | string; // Allows comparing numbers, dates, or strings lexicographically
  $gte?: number | Date | string;
  $lt?: number | Date | string;
  $lte?: number | Date | string;
  $in?: (MysqlFieldValue | Date)[]; // Field value must be in the array
  $nin?: (MysqlFieldValue | Date)[]; // Field value must not be in the array
}

export type FieldCondition = MysqlFieldValue | Date | ComparisonOperators;

export type WhereParameters = {
  $or?: WhereParameters[];
  $and?: WhereParameters[];
  $nor?: WhereParameters[];
  $not?: WhereParameters;
  [key: string]: FieldCondition | WhereParameters | WhereParameters[];
};

///////////

///////////

export type EbgMysqlTableKeysArray = EbgMysqlFieldType[];

export type ListParameters = {
  page?: number;
  count?: number;
  sort?: object;
  where?: object;
};

export interface EbgMysqlDriverConfig {
  enableBinaryLogListener?: Boolean;
  provider?: string;
  connection?: object;
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
  host: "localhost",
  username: "ebg",
  password: "",
  port: 3306,
  database: "ebg",
  dialect: "mysql",
};

export const mysqlSettings = {
  ...defaultMysqlSettings,

  host: _.get(env, "MYSQL_HOST", defaultMysqlSettings.host),
  username: _.get(env, "MYSQL_USER", defaultMysqlSettings.username),
  password: _.get(env, "MYSQL_PASS", defaultMysqlSettings.password),
  port: Number(_.get(env, "MYSQL_PORT", defaultMysqlSettings.port)),
  database: _.get(env, "MYSQL_DATABASE", defaultMysqlSettings.database),
};

export const isMysqlEnabled = true;
export const isListenerEnabled = true;
export const defineRelativePath = "../../../src/models/mysql.defines.ts";
export const MAX_SERVER_ID = 4294967295;
export const connectTimeout = 30000;
const acquireTimeout = 30000;

export class EbgMysqlDb {
  private Pool: Pool | null = null;
  private Db: Kysely<any> | null = null;
  private config: EbgMysqlConfig;
  private listener;

  constructor(settings: EbgMysqlConfig, config?: any) {
    const { database, username: user, password, host, port } = settings;

    try {
      this.Pool = createPool({
        host,
        user,
        password,
        database,
        connectTimeout,
        // acquireTimeout
      });

      this.Db = new Kysely<any>({
        dialect: new MysqlDialect({ pool: this.Pool }),
      });
    } catch (error) {
      console.error("Error importing database definitions:", error);
      throw new Error("Failed to import database definitions.");
    }

    // Create the listener here if ever it does exist.
    const enabledListener: boolean = config.hasOwnProperty(
      "enableBinaryLogListener"
    )
      ? config.enableBinaryLogListener
      : false;

    if (enabledListener) {
      this.listener = createListener(this.Pool, settings);
    }

    this.config = { ...settings, ...config };
  }

  public db() {
    return this.Db;
  }

  public getConfig() {
    return this.config;
  }

  public async start() {}

  public async shutdown() {
    if (this.db === null) {
      return false;
    }

    await this.Db.destroy();
    return true;
  }

  public async execute(sql: string, repl?: any[] | Record<string, any>) {
    const db = this.db();
    return await executeRawQuery(db, sql, repl);
  }
}
