import Http, { port as ServerPort } from "./http";
import Checkpoint from "./http/checkpoint";
import Log from "./logs";
import { config, mongo, mysql, mysql3, prisma } from "./database";
import EbgQueue from "./queue";
import Moralis from "./moralis";
import Cache from "./cache";
import Cron from "./cron/v3";
import Slack from "./socials/slack";
import Discord from "./discord";

import { Modules } from "./defines";
export { Modules }

// export type Modules =
//   | "queue"
//   | "logger"
//   | "mongodb"
//   | "moralis"
//   | "cron"
//   | "cache"
//   | "slack"
//   | "checkpoint"
//   | "mysqldb"
//   | "http"
//   | "prismadb"
//   | "discord";

/**
 * checkpoint api
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const checkpoint = async (appConfig?, appModules?) => {
  const { modules } = appConfig;
  if (modules.indexOf("http") < 0) {
    return Promise.reject(
      `HTTP module is not enabled! Please enable HTTP module first before using the checkpoint module!`
    );
  }
  return Promise.resolve(true);
};

/**
 * logging service via aws cloudwatch
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const logger = async (appConfig?, appModules?) => {
  const log = await Log.init();
  console.log("✔️  Logger initialized.");
  return log;
};

/**
 * discord service/ module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const discord = async (appConfig?, appModules?) => {
  try {
    const discord = await Discord.init();
    console.log("✔️  Discord initialized.");
    return discord;
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * mongodb module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const mongodb = async (appConfig?, appModules?) => {
  try {
    const connection = await mongo.connect({});
    console.log("✔️  MongoDB database connected.");

    mongo.autoloadBaseModels();
    mongo.autoLoadModels();
    return connection;
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * mysql module
 *
 * @param appConfig
 * @param appModules
 */
const mysqldb = async (appConfig?, appModules?) => {
  try {
    let connection;

    const mysqlConfig = config(appConfig).mysql as any;
    if (mysqlConfig?.provider === "mysql3") {
      connection = await mysql3.init(mysqlConfig);
    } else {
      connection = await mysql.init(appConfig);
    }

    // const connection = await mysql.connect();
    console.log("✔️  Mysql database connected.");
    return connection;
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * queue module using aws sqs
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const queue = async (appConfig?, appModules?) => {
  const _queue = await EbgQueue.init();
  console.log("✔️  SQS queue ready.");
  return _queue;
};

/**
 * moralis API module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const moralis = async (appConfig?, appModules?) => {
  const moralis = await Moralis.init();
  console.log("✔️  Moralis is ready.");
  return moralis;
};

/**
 * slack API module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const slack = async (appConfig?, appModules?) => {
  const slackObj = Slack.init();
  console.log("✔️  Slack is ready.");
  return Promise.resolve(slackObj);
};

/**
 * http/web server module using express.
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const http = async (appConfig?, appModules?) => {
  const { modules } = appConfig;
  const _server = Http.create(appConfig, appModules);

  // Start it!
  const serverInstance = await Http.start(_server);
  console.log(`✔️  HTTP Server ready and listening at port ${ServerPort}`);
  return Promise.resolve(serverInstance);
};

/**
 * cache module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const cache = async (appConfig?, appModules?) => {
  try {
    const cache = await Cache.init();
    console.log(`✔️  Cache ready`);
    return cache;
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * cron module
 *
 * @param appConfig
 * @param appModules
 * @returns
 */
const cron = async (appConfig?, appModules?) => {
  try {
    const cron = Cron.init(appModules);
    console.log(`✔️  Cron jobs ready`);
    return Promise.resolve(cron);
  } catch (err) {
    return Promise.reject(err);
  }
};

const prismadb = async (appConfig?, appModules?) => {
  try {
    const connection = await prisma.init(appConfig);
    console.log("✔️  Prisma database connected.");
    return connection;
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 * list of all available modules
 */
export const allModules = {
  queue,
  logger,
  mongodb,
  moralis,
  cron,
  cache,
  slack,
  checkpoint,
  mysqldb,
  http,
  prismadb,
  discord,
};

/**
 * loads all modules specified in @src/config.ts
 *
 * @param appConfig
 * @returns
 */
const loadAll = async (appConfig: any, parentApp: any) => {
  const loadedModules = appConfig?.modules || [];
  parentApp.modules = loadedModules;

  if (loadedModules.length === 0) {
    return Promise.resolve(parentApp);
  }

  // fetch all module handlers
  for (const loadedModule of loadedModules) {
    if (!allModules.hasOwnProperty(loadedModule)) {
      return Promise.reject(
        `Module '${loadedModule}' not found! Please check your modules list and try again.`
      );
    }

    const _module = allModules[loadedModule];
    try {
      parentApp[loadedModule] = await _module(appConfig, parentApp);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  return Promise.resolve(parentApp);
};

export default {
  loadAll,
};
