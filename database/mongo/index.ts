import mongoose from "mongoose";
import { fetchAllFiles } from "../../helpers";
import { isRunningInTypeScript, getAppInstance } from "../../server/index";

/**
 * just fetching environment
 */
const { env } = process;

/**
 * manually putting base models first.
 */
const baseModels = ["NodeConfig", "NodeServers"];

/**
 * Check if the mongo module is enabled.
 *
 * @returns {boolean}
 */
export const isMongoEnabled = () => {
  const modules = getAppInstance("modules");
  return modules.indexOf("mongodb") >= 0;
};

/**
 * Generate the actual mongo db url to be used for connection.
 *
 * @returns {string}
 */
const generateMongooseURL = (): string => {
  const host = env.MONGO_HOST || "127.0.0.1";
  const port = env.MONGO_PORT || 27017;

  let credentials = env.MONGO_USER ? `${env.MONGO_USER}` : "";
  if (env.MONGO_PASS) {
    credentials += `:${env.MONGO_PASS}`;
  }

  let url = `mongodb://${!credentials ? "" : `${credentials}@`}${host}:${port}`;
  if (env.MONGO_COLLECTION) {
    url += `/${env.MONGO_COLLECTION}`;
  }
  if (env.MONGO_HOST_URI) {
    url += `?${env.MONGO_HOST_URI}`;
  }

  return url;
};

/**
 * Starts the database
 *
 * @param opts
 * @returns {Promise}
 */
const connect = async (opts: any): Promise<typeof mongoose> => {
  const url = generateMongooseURL() || "";
  return mongoose.connect(url, opts);
};

/**
 * auto load all models found in src/models
 *
 * @returns {Boolean}
 */
const autoLoadModels = async () => {
  const modelPath = "./src/models";
  const modelFiles: Array<string> = fetchAllFiles(modelPath);

  if (modelFiles.length === 0) {
    return Promise.resolve(true);
  }

  for (const modelFile of modelFiles) {
    if (modelFile === `${modelPath}/README.md`) {
      continue;
    }
    if (modelFile === `${modelPath}/.DS_Store`) {
      continue;
    }

    const moduleName = modelFile.split("/").pop()?.split(".")[0] || "";
    const relativeFilePath = modelFile.replace(modelPath, "");
    const path = `${process.cwd()}/src/models${relativeFilePath}`;
    exports[moduleName] = require(path);
  }

  return Promise.resolve(true);
};

/**
 * autoloading all stuff in the base models folder.
 *
 * @returns
 */
const autoloadBaseModels = async () => {
  const isTs = isRunningInTypeScript();
  const cwd = process.cwd();

  for (const baseModel of baseModels) {
    const path = `${cwd}/modules/database/models/${baseModel}.${
      isTs ? "ts" : "js"
    }`;
    exports[baseModel] = require(path);
  }

  return Promise.resolve(true);
};

export default {
  connect,
  autoLoadModels,
  autoloadBaseModels,
  isMongoEnabled,
};

export const connectDatabase = connect;
