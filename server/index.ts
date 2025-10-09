import main from '@src/main';
import appConfig from '@src/config';
import Modules from '../modules';
import { generateId } from './defines';
import Instances from './instances/v2';

import NodeServers from '../database/models/NodeServers';
import { getMyIPAddress, getServerName } from '../helpers';
import { getEnv, isDevEnv, getEnvVariable } from '../env';
import axios from 'axios';
import _ from 'lodash';
import Mysql from '../database/mysql';
import badwords from '@modules/badwords';
import { memoryUsage } from 'node:process';
import serviceTokens from '@modules/auth/serviceTokens';

// globul variables
export var _app: any = {};
export var timezone;
export var instanceId: string = '';

/**
 * check if running executable is running on typescript or on plain javascript
 *
 * @returns
 */
export const isRunningInTypeScript = () => {
  const args = process.argv;
  const files = args.filter((arg) => arg.includes('index')).map((arg) => arg.split('/').at(-1));
  const indexFiles = _.uniq(files);
  const indexFile = indexFiles.length > 0 ? indexFiles[0] : '';

  return indexFile.split('.').at(-1).toLowerCase() === 'ts';
};

/**
 * get application instance. duh.
 *
 * @return
 */
export const getAppInstance = (module = '') => {
  if (module.length > 0) {
    return _.get(_app, module, null);
  }
  return _app;
};

/**
 * start the server.
 */
const start = async () => {
  // First, set the server id.
  instanceId = await generateId();

  // Settle for memory information
  const currentMemoryUsage = memoryUsage();
  const { heapTotal } = currentMemoryUsage;
  // console.log(`Total limit for memory: ${heapTotal}`);

  // Setup information
  const info = {
    ipAddress: getMyIPAddress(),
    instanceName: getServerName(),
    instanceId,
    heapTotal,
  };

  // add process handlers
  attachProcesshandlers();

  // Check if running on ts
  // const isTypescript = isRunningInTypeScript();
  // console.log(`are you running typescript? ${isTypescript ? 'yes' : 'no'}`)

  // get global timezone
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // initiate bad word library
  badwords.init();

  // initiate service tokens
  serviceTokens.init();

  // If there's a "pre-hook" maybe run it out.
  // @todo:

  // load all modules
  Modules.loadAll(appConfig, _app)
    .then(async (application) => {
      // Add server to list
      // const instance = await Instances.create(application, appConfig);
      const instance = await Instances.init(appConfig, { ...info, timezone, env: getEnv() });

      // Set assignment to global variable
      _app = { info, ...application, timezone, instance };

      // // Then start database listener.
      // Mysql.startListening();

      // Then mark the timestamp of the server instance
      

      // Lastly, you can now run the main function.
      if (typeof main === 'function') {
        main(_app);
      }
    })
    .catch((err) => {
      // Something went wrong.
      console.error(err);
    });
};

/**
 * attaching handlers themselves.
 *
 */
const attachProcesshandlers = () => {
  ['SIGINT', 'SIGTERM'].forEach((signal: string) => {
    process.on(signal, () => {
      shutdown().then(process.exit);
    });
  });

  process.on('exit', (code) => {
    console.log(`Node.js process exited with code ${code}`);
  });
};

/**
 * shutdown the server
 *
 * @returns
 */
const shutdown = async () => {
  // clean up instances
  await Instances.shutdown();

  // Shutdown express server.
  const server = getAppInstance('http');
  if (server !== null) {
    await server.close();
  }

  // Shutdown mysql server.
  const mysql = getAppInstance('mysqldb');
  if (mysql !== null) {
    await mysql.shutdown();
  }

  // Disconnect the mongoose instance
  const mongodb = getAppInstance('mongodb');
  if (mongodb !== null) {
    await mongodb.connection.close();
  }

  // clear all cronjbos
  const cronjobs = getAppInstance('cron');
  if (cronjobs !== null) {
    cronjobs.shutdown();
  }

  // disconnect cache
  const cache = getAppInstance('cache');
  if (cache !== null) {
    await cache.shutdown();
  }

  // Output
  return Promise.resolve(0);
};

export default {
  start,
  instanceId,
};
