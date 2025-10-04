
import SQS, { defaultSQSUrl } from "./sqs";
import Listener from "./listener"
import { sleep } from "../helpers"

let config;
const filteredGroupIds = [];
export const sqs = SQS;

/**
 * initialize sqs queue module
 * 
 * @returns 
 */
const init = async () => {
  config = await SQS.load();
  return Promise.resolve(config);
}

/**
 * push to the queue
 * 
 * @param groupId 
 * @param payload 
 */
const push = async (groupId: string, payload: any) => {
  await SQS.push(config.url, groupId, payload);
}

/**
 * listen to the queue if something arrives
 * 
 * @param groupId 
 */
const listen = (groupId: string, handleMessage?: () => any) => {
  return Listener.create(groupId, config.url, config.client);
}

/**
 * just use this for testing purposes
 * 
 * @param groupId 
 * @param maxWaitTimeMs 
 * @param payload 
 * @param autoStart 
 */
const randomPing = async (groupId: string, maxWaitTimeMs: number, inputPayload: object | (() => any | Promise<any>), autoStart?: boolean) => {
  let running: boolean = autoStart ? autoStart : true;

  do {
    // settle payload first
    const payload = (typeof inputPayload === 'function') ? (await inputPayload()) : inputPayload;
    await push(groupId, payload);

    const waitTime = Math.floor(Math.random() * maxWaitTimeMs) + 1;
    await sleep(waitTime);
  } while(running);
 

  return {
    start: () => {},
    stop: () => {},
  }
}

export default {
  push, init, listen, randomPing
}
