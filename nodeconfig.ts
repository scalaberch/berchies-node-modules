import NodeConfig from "./database/models/NodeConfig";
import _ from "lodash";

export const ConfigModel = NodeConfig;

/**
 * Gets the configuration object of the application
 *
 * @returns
 */
const getConfigObject = async () => {
  return await NodeConfig.findOne({}).lean();
};

/**
 * Checks if the configuration system is initialized
 *
 * @returns
 */
const isInitialized = async () => {
  const config = await getConfigObject();
  return config !== null;
}

/**
 * Gets a config variable
 *
 * @param key
 * @returns
 */
const getConfig = async (key: string) => {
  const config = await getConfigObject();
  return config === null ? null : _.get(config, key, null);
};

/**
 * Sets a config variable
 *
 * @param key
 * @param value
 * @returns
 */
const setConfig = async (key: string, value: any) => {
  const isInit = await isInitialized();
  const update = {};

  // Set value.
  update[key] = value;

  // do it.
  return isInit
    ? await NodeConfig.findOneAndUpdate({}, update)
    : await NodeConfig.create(update);
};

export default {
  isInitialized,
  getConfigObject,
  getConfig,
  setConfig,
};
