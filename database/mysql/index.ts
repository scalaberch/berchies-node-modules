import _ from 'lodash';
import knex, { Knex } from 'knex';
import { Sequelize } from 'sequelize';
export { QueryTypes, Op, Model } from 'sequelize';
import mysqlLegacy from 'mysql';
import MySQLEvents from '@rodrigogs/mysql-events';
import { env } from '../../env';
import { getAppInstance, _app } from '@modules/server/index';
import { randomNumber, waitUntil } from '../../helpers';
import { sleep } from '../../helpers';
import { isCurrentInstanceMaster } from '../../server/instances';
import EventEmitter2 from 'eventemitter2';

// import PrismaDb from "./prisma"
// import { EventEmitter } from "events";
// NodeJS.EventEmitter

var _db: Knex | null = null;
var _model;
let _listener = null;
let binLogListen: boolean = false;
let _mysqlConfig: any = {};

export const MAX_SERVER_ID = 4294967295;

/**
 * configuration object
 * @deprecated
 *
 */
export const config = {
  hostname: env.MYSQL_HOST || 'localhost',
  username: env.MYSQL_USER || 'ebg',
  password: env.MYSQL_PASS || '',
  database: env.MYSQL_DATABASE || 'ebg',
  port: env.MYSQL_PORT || 3306,
};

/**
 * get table attributes
 *
 * @param tableName
 * @param listOnly
 * @returns
 */
export const getTableAttributes = async (tableName: string, listOnly = true) => {
  const db = await createMysql();
  let list = [];

  try {
    const columns = await db(tableName).columnInfo();
    list = Object.keys(columns);
  } catch (err) {
    console.error('Error getting field list:', err);
    throw err;
  } finally {
    db.destroy(); // Close the connection pool when done
  }

  return list;
};

/**
 * sequelize, create db thing
 *
 * @returns
 */
export const createDb = () => {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.hostname,
    dialect: 'mysql',
    logging: false,
    // logging: console.log
  });

  return sequelize;
};

/**
 * connects to a mysql server given configuration
 *
 * @deprecated
 * @returns
 */
const connect = async () => {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.hostname,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    // console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

  return sequelize;
};

/**
 *
 * @param model
 * @param excludePrimaryKey
 */
export const getModelAttributes = (model: any, excludePrimaryKey = false) => {
  const attributeObject = model.getAttributes();
  const attributes = Object.keys(attributeObject);

  if (excludePrimaryKey) {
    const primaryKey = model.primaryKeyAttribute;
    const filteredAttributes = attributes.filter((attr) => attr !== primaryKey);
    return filteredAttributes;
  }

  return attributes;
};

/**
 * get the mysql (knex) db instance
 *
 * @returns
 */
export const db = () => {
  if (typeof getAppInstance !== 'function') {
    return null;
  }

  const mysqldb = getAppInstance('mysqldb');
  if (mysqldb === null) {
    return null;
  }

  return mysqldb.mysql;
};

/**
 * connect knex using mysql
 *
 * @returns
 */
export const createMysql = async () => {
  const connection = getConfig('config');

  const db = knex({
    client: 'mysql2',
    connection,
    // pool: { min: 2, max: 10 },
    pool: { min: 3, max: 20, acquireTimeoutMillis: 60000 },
  });

  // Attempt connection
  try {
    await db.raw('SELECT 1');
    return db;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * clean up and initialize configuration settings
 *
 * @param appConfig
 */
const initConfig = (appConfig: any) => {
  _mysqlConfig = _.get(appConfig, 'mysql', {}) as object;

  // Setup config
  _mysqlConfig['config'] = {
    host: _.get(env, 'MYSQL_HOST', 'localhost'),
    user: _.get(env, 'MYSQL_USER', 'ebg'),
    password: _.get(env, 'MYSQL_PASS', ''),
    database: env.MYSQL_DATABASE || 'ebg',
    port: Number(env.MYSQL_PORT || '3306'),
  };

  return _mysqlConfig;
};

/**
 * initialize database (the knex one)
 *
 * @returns {knex.Knex}
 */
const init = async (appConfig: any) => {
  // initialize configuration
  const mysqlConfig = initConfig(appConfig);

  // Check if the provider is set manually
  const provider = _.get(mysqlConfig, 'provider', 'knex') as string;
  if (provider === 'prisma') {
    // return await PrismaDb.initialize();
  }

  // Start knex mysql
  _db = await createMysql();

  // enable listener.
  const enableBinaryLogListener = getConfig('enableBinaryLogListener');
  if (enableBinaryLogListener) {
    _listener = await crateBinaryLogListener(_db.client, true);
  }

  return {
    mysql: _db,
    listener: _listener,
    shutdown: () => {
      if (enableBinaryLogListener) {
        _listener.stop();
      }
      _db.destroy();
    },
  };
};

/**
 * get a configuration value
 *
 * @param config
 */
const getConfig = (config = '') => {
  const obj = _.get(_mysqlConfig, config, null);
  return _.cloneDeep(obj); // for this to *not* remove password and other important stuff
};

/**
 * custom db event emitter
 *
 * @returns {EventEmitter}
 */
export const dbEvent = new EventEmitter2({
  verboseMemoryLeak: false,
  ignoreErrors: false,
});

/**
 * convert table charset to utf8mb4
 *
 * @returns {void}
 */
export const convertToUtf8mb4 = async () => {
  if (_db === null) {
    return Promise.resolve(false);
  }

  const tables = await _db('information_schema.columns')
    .select('table_name', 'column_name', 'character_set_name')
    .where('table_schema', config.database)
    .where('character_set_name', 'utf8mb3');

  if (tables.length > 0) {
    for (const table of tables) {
      // console.log(table);
      await _db.raw(`ALTER TABLE ${table.TABLE_NAME} MODIFY ${table.COLUMN_NAME} TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    }
  }

  return Promise.resolve(true);
};

/**
 * create a binary log listener object
 *
 * @param notifyOnStart
 */
const crateBinaryLogListener = async (db, notifyOnStart = false) => {
  const connectionConfig = getConfig('config');
  const dbName = _.get(connectionConfig, 'database', '');

  const connection = mysqlLegacy.createPool({
    ...connectionConfig,
    connectTimeout: 30000,
    acquireTimeout: 30000,
  });

  const serverId = randomNumber(1, MAX_SERVER_ID);
  const mysqlEventsConfig = {
    startAtEnd: true,
    includeSchema: {
      [dbName]: true,
    },
    serverId,
  };

  const instance = new MySQLEvents(connection, mysqlEventsConfig);
  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (err) => {
    console.error('triggered on MySQLEvents.EVENTS.CONNECTION_ERROR');
    console.error(err);
  });
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (err) => {
    console.error('triggered on MySQLEvents.EVENTS.ZONGJI_ERROR');
    console.error(err);
  });

  instance.addTrigger({
    name: 'monitoring',
    expression: `${config.database}.*`,
    statement: MySQLEvents.STATEMENTS.ALL,
    onEvent: async (event) => {
      // console.log(event);
      // console.log(event.affectedRows);

      let emitKey = '';
      switch (event?.type) {
        case 'INSERT':
          emitKey = 'insert';
          break;
        case 'UPDATE':
          emitKey = 'update';
          break;
        case 'DELETE':
          emitKey = 'delete';
          break;
      }

      if (emitKey !== '') {
        dbEvent.emit(emitKey, event);
      }
    },
  });

  return instance;
};

/**
 * start listening
 *
 */
const startListening = async () => {
  const enableBinaryLogListener = getConfig('enableBinaryLogListener');
  const listenerExists = _listener !== null;
  // const isMaster = await isCurrentInstanceMaster();

  if (enableBinaryLogListener && listenerExists) {
    await sleep(1000);

    // Then start listen!
    _listener
      .start()
      .then(() => {
        console.log('  • Started listening to MySQL database for changes...');
      })
      .catch((err) => console.error('Something bad happened at MySQLEvents', err));
  }
};

export default {
  connect,
  init,
  startListening,
};
