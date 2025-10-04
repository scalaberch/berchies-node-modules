import axios from 'axios'
import { isProductionEnv, getEnvVariable } from '@modules/env'
import { v4 as uuidv4 } from 'uuid'

export type ServerModule = "logger" | "mongodb" | "mysqldb" | "cache" | "cron" | "http" | 'queue' | 'discord'

export interface ServerDefine {
}

export const generateId = async () => {
  if (isProductionEnv()) {
    return await getEcsTaskId();
  }
  return uuidv4();
}

const getEcsTaskId = async () => {
  const metadataUri = getEnvVariable('ECS_CONTAINER_METADATA_URI_V4', false, '');
  if (metadataUri === '') {
    return uuidv4();
  }

  const res = await axios.get(`${metadataUri}/task`);
  const arn = res.data.TaskARN; // e.g., arn:aws:ecs:region:account-id:task/cluster-name/task-id
  const taskId = arn.split('/').pop();
  return taskId;
}

export default {
}