import _ from 'lodash';
import Cache from '@modules/cache';
import { getEnvVariable } from '@modules/env';
import moment from 'moment-timezone';
import { timestampFormat } from '@modules/constants';

const cacheKey = `ebg_node_instances:${getEnvVariable('PROJ_NAME')}`;
const masterInstanceKey = `${cacheKey}-master`;
const keyExpiryTime = 120; // every 2 minutes
const minHeartBeatTimeSec = 30;
const maxHeartBeatTimeSec = 60;

let instanceInfo: any = {};
let enabled = false;
let instanceKey = '';
let started_at = '';

const init = async (appConfig: any, info: any) => {
  enabled = areRequiredModulesEnabled(appConfig);
  if (!enabled) {
    return false;
  }

  started_at = moment().format(timestampFormat);
  instanceInfo = info;
  instanceKey = `${cacheKey}:${getInstanceId()}`;

  // trigger heartbeat
  heartbeat();
};

const shutdown = async () => {
  if (enabled && instanceKey !== '') {
    await Cache.del(instanceKey);
  }
};

const checkAndAssignMaster = async (instanceId: string) => {
  // get all the instances
  const instances = await getAllInstances();

  // if there's only 1 instance found, and that instance is me
  if (instances.length === 1) {
    const currentInstance = instances[0];
    if (currentInstance.instanceId === instanceId) {
      await Cache.set(masterInstanceKey, instanceId);
      return;
    }
  }

  const currentMasterInstanceKey = await Cache.get(masterInstanceKey);
  const currentMasterInstances = instances.filter((inst) => inst.instanceId === currentMasterInstanceKey);
  if (currentMasterInstances.length === 0) {
    await Cache.set(masterInstanceKey, instanceId);
    return;
  }
};

const areRequiredModulesEnabled = (appConfig: any) => {
  const { modules } = appConfig;
  if (modules.indexOf('cache') >= 0) {
    return true;
  }
  return false;
};

const getAllInstances = async () => {
  const masterInstance = await Cache.get(masterInstanceKey);
  const instances = await Cache.getAllObjects(`${cacheKey}:`);

  for (const key in instances) {
    const instance = instances[key];
    const isMaster = instance.instanceId === masterInstance;
    instances[key] = { ...instance, isMaster };
  }

  return instances;
};

const heartbeat = async () => {
  // set data
  const last_update = moment().format(timestampFormat);
  await Cache.setObject(instanceKey, { ...instanceInfo, started_at, last_update });

  // Set object expiry.
  await Cache.setObjectExpiry(instanceKey, keyExpiryTime);

  // attempt register master
  await checkAndAssignMaster(getInstanceId());

  // trigger delay
  const delay = Math.floor(Math.random() * 1000 * minHeartBeatTimeSec) + maxHeartBeatTimeSec * 1000;
  setTimeout(heartbeat, delay);
};

const isCurrentInstanceMaster = async () => {
  const currentMasterInstanceKey = await Cache.get(masterInstanceKey);
  return currentMasterInstanceKey === instanceInfo.instanceId;
};

const getInstanceId = () => {
  return _.get(instanceInfo, 'instanceId', '') as string;
};

export default {
  init,
  getAllInstances,
  shutdown,
  isCurrentInstanceMaster,
  getInstanceId,
};
