import NodeServers, { NodeServersDoc } from '../../database/models/NodeServers';
import { getMyIPAddress, getServerName, randomNumber, sleep } from '../../helpers';
import { getEnv, isDevEnv, getEnvVariable, env } from '../../env';
import axios from 'axios';
import _ from 'lodash';
import { getAppInstance } from '../index';
import { isMongoEnabled } from '../../database/mongo/index';

/**
 * handle on server start to refresh server
 *
 */
const addServerToList = async () => {
  const hostname = getServerName();
  const ipAddress = getMyIPAddress();
  const environment = getEnv();
  const port = Number(getEnvVariable('PORT') || 5000);

  // Force disable this first!
  return null;

  const mongo = getAppInstance('mongodb');
  if (mongo === null) {
    return null;
  }

  // Wait for random seconds between 0-3 seconds
  const randomTime = randomNumber(1000, 3000);
  await sleep(randomTime);

  const instanceCount = await getTotalInstanceCount();
  if (instanceCount === 0) {
    // Add this instance and mark this as master.
    const instance = await addInstance(hostname, ipAddress, environment, port, true);
    return instance;
  }

  // Otherwise, check if first this current instance has already been recorded.
  let currentInstance = await getCurrentInstance();
  if (currentInstance === null) {
    currentInstance = await addInstance(hostname, ipAddress, environment, port, false);
  }

  // Get master instance
  const masterInstance = await getMasterInstance();
  const isMasterRunning = await isInstanceRunning(masterInstance);
  if (!isMasterRunning) {
    // If NOT running then kick this master
    await NodeServers.updateMany({ isMaster: true }, { isMaster: false });

    // Set current instance as master
    await NodeServers.updateOne({ _id: currentInstance._id }, { isMaster: true });
  }

  return currentInstance;
};

/**
 * get an instance using ip address
 *
 * @param ipAddress
 * @returns
 */
const getInstanceByIp = async (ipAddress: string) => {
  if (!isMongoEnabled()) {
    return false;
  }

  await NodeServers.findOne({ ipAddress }).lean();
};

/**
 * gets the current instance using its ip address and environment
 *
 * @returns
 */
const getCurrentInstance = async () => {
  if (!isMongoEnabled()) {
    return null;
  }

  const ipAddress = getMyIPAddress();
  const environment = getEnv();
  return await NodeServers.findOne({ ipAddress, environment }).lean();
};

/**
 *
 * @returns
 */
export const isCurrentInstanceMaster = async () => {
  const currentInstance = await getCurrentInstance();
  return currentInstance === null ? false : currentInstance.isMaster;
};

/**
 *
 * @returns
 */
const getMasterInstance = async () => {
  return await NodeServers.findOne({ isMaster: true }).lean();
};

/**
 * check if an instance is running or not.
 *
 * @param instance
 */
const isInstanceRunning = async (instance: NodeServersDoc) => {
  if (instance === null) {
    return false;
  }

  const env = instance?.environment;
  const port = getEnvVariable('PORT') || 5000;
  const hostname = env === 'dev' ? instance?.hostname : instance?.ipAddress;
  const endpoint = `http://${hostname}:${port}`;

  try {
    await axios.get(endpoint);
    return true;
  } catch (err) {
    return false;
  }
};

export const getServerAddress = () => {
  const ipAddress = getMyIPAddress();
  const port = getEnvVariable('PORT') || 5000;
  return `http://${ipAddress}:${port}`;
};

/**
 * check if the server instance on a given ip address is running
 *
 * @param ip
 * @returns
 */
const isIPRunning = async (ip: string) => {
  const port: number = parseInt(getEnvVariable('PORT')) || 5000;
  const url = `http://${ip}:${port}`;

  try {
    await axios.get(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * get all instances
 *
 * @returns
 */
const getTotalInstanceCount = async () => {
  if (!isMongoEnabled()) {
    return 0;
  }
  return await NodeServers.countDocuments({});
};

/**
 * deletes all instance entry from mongo
 *
 */
const clearAllInstanceData = async () => await NodeServers.deleteMany({});

/**
 * force reset all master instances
 *
 * @returns
 */
const resetMasterInstance = async () => {
  const master = await getMasterInstance();
  if (master === null) {
    return Promise.resolve(true);
  }

  const isMasterRunning = await isInstanceRunning(master);
  if (!isMasterRunning) {
    await NodeServers.updateMany({ isMaster: true }, { isMaster: false });
  }

  return Promise.resolve(true);
};

/**
 * create instance record
 *
 * @param hostname
 * @param ipAddress
 * @param environment
 * @param port
 * @param isMaster
 */
const addInstance = async (hostname: string, ipAddress: string, environment: string, port: number, isMaster = false) => {
  // Check first if given ipAddress and env already exists.
  const existingInstance = await NodeServers.findOne({
    ipAddress,
    environment,
  }).lean();

  if (existingInstance === null) {
    return await NodeServers.create({
      hostname,
      ipAddress,
      environment,
      isMaster,
      port,
    });
  }

  // Update it if it exists.
  await NodeServers.updateOne(
    {
      _id: existingInstance._id,
    },
    {
      isMaster,
      hostname,
      port,
    }
  );

  return existingInstance;
};

export default {
  getInstanceByIp,
  clearAllInstanceData,
  addServerToList,
  isIPRunning,
  isCurrentInstanceMaster,
};
