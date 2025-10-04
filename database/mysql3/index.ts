import * as fs from 'fs';
import * as path from 'path';
import { Kysely, Transaction, sql } from 'kysely';
import { createPool, Pool } from 'mysql2';
import { getEnv } from '@modules/env';
import Methods from './methods';
import { mysqlSettings, isMysqlEnabled, defineRelativePath, EbgMysqlDb } from './defines';

// import { DB } from "@src/models/mysql.defines"

// required variables
let _database: null | EbgMysqlDb = null;
export interface DatabaseSchema {}
export let additionalConfig = {};
export const settings = mysqlSettings;

/**
 * gets the database instance
 *
 * @returns
 */
export const Db = (): Kysely<any> | null => {
  if (!isInitialized()) {
    return null;
  }
  return _database.db();
};

/**
 * initialization function. to be called on the modules initiator
 *
 * @param mysqlConfig
 * @returns
 */
const init = async (mysqlConfig: object) => {
  // const definesPath = path.resolve(__dirname, defineRelativePath); // Construct absolute path
  // if (!fs.existsSync(definesPath)) {
  //   throw new Error(`Database definitions file not found at ${definesPath}. Please generate definitions using kysely-codegen.`);
  // }

  if (!isInitialized()) {
    additionalConfig = mysqlConfig;
    _database = new EbgMysqlDb(mysqlSettings, mysqlConfig);
  } else {
    console.warn(
      'Database already initialized. Re-initialization is not recommended. You may get the db instance at the main library class.'
    );
  }

  return _database;
};

/**
 * check if database has been initialized
 *
 * @returns
 */
const isInitialized = () => _database !== null;

/**
 * call a query
 *
 * @param sql
 * @param repl any[] | Record<string, any>
 * @returns
 */
export const query = async (sql: string, repl?: any[] | Record<string, any>) => {
  if (isInitialized()) {
    return _database.execute(sql, repl);
  }
  throw Error('Error: Database is not initialized! Could not execute query.');
};

/**
 * check if a table exists in the database
 *
 * @param tableName
 * @returns
 */
export const tableExists = async (tableName: string) => {
  const db = Db();
  if (db === null) {
    throw Error('Error: Database is not initialized! Could not check for table existence.');
  }

  const result = await db
    .selectFrom('information_schema.tables')
    .select(['table_name'])
    .where('table_schema', '=', mysqlSettings.database)
    .where('table_name', '=', tableName)
    .execute();

  const tableExists = result.length > 0;
  return tableExists;
};

/**
 *
 * @param callback
 * @returns
 */
export const createTransaction = async <T>(callback: (trx: Transaction<any>) => Promise<T>): Promise<T> => {
  const db = _database.db();

  return db.transaction().execute(async (trx) => {
    return await callback(trx); // important to return this
  });
};

export default {
  init,
  isInitialized,
  query,
  sql,
};
