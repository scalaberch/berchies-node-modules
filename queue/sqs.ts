import {
  SQSClient,
  GetQueueUrlCommand,
  CreateQueueCommand,
  SendMessageCommand,
  QueueDoesNotExist
} from '@aws-sdk/client-sqs';
import { getEnvTag, waitUntil } from "../helpers"

const { env } = process;

const config = {
  region: env.AWS_DEFAULT_REGION || '',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
  }
}

export const sqsName = env.AWS_SQS_NAME || 'queue'
export const defaultSQSUrl = env.AWS_SQS_URL || '';
export const isFifo = env.AWS_SQS_FIFO === 'true' || false;
export const queueName = `${[sqsName, getEnvTag()].join('-')}${isFifo ? '.fifo' : ''}`;
export const client = new SQSClient(config)

/**
 * check if the sqs queue already exists
 * 
 * @param queueName 
 * @return {Promise<Boolean>}
 */
const exists = async (queueName: string) => {
  try {
    const getQueueUrlParams = { QueueName: queueName, };
    await client.send(new GetQueueUrlCommand(getQueueUrlParams));
    return true; // Queue exists
  } catch (error) {
    // if (error instanceof QueueDoesNotExist) {
    //   return false; // Queue does not exist
    // } else {
    //   throw error; // Rethrow other errors
    // }

    // @todo: just log the error 
    return false;
  }
}

/**
 * create an sqs queue
 * 
 * @param queueName 
 * @returns {Promise}
 */
const create = async (queueName: string) => {
  let result;

  const params = {
    QueueName: queueName,
    Attributes: {
      FifoQueue: 'true',
      ContentBasedDeduplication: 'true'
    }
  };

  try {
    // send command to create
    const result = await client.send(new CreateQueueCommand(params));
    // // then wait for confirmation
    // await waitUntil(async () => await exists(queueName));
    // Then return result.
    return result;
  } catch (error) {
    console.error(error)
    return false;
  }

}

/**
 * get the sqs queue url via queue name
 * 
 * @param queueName 
 */
const getUrl = async (queueName: string) => {
  let url = '';

  try {
    const getQueueUrlParams = { QueueName: queueName, };
    const response = await client.send(new GetQueueUrlCommand(getQueueUrlParams));
    url = response?.QueueUrl || '';
  } catch (error) {
    // console.error(error);
    return '';
  }

  return url;
}

/**
 * call this to load the queue for initialization
 * 
 * @return { Object }
 */
const load = async () => {
  let queueUrl = await getUrl(queueName);
  if (queueUrl === '') {
    const newQueue = await create(queueName);
    if (newQueue !== false) {
      queueUrl = newQueue?.QueueUrl || '';
    }
  }

  return {
    client,
    config,
    url: queueUrl
  }
}

/**
 *
 * @return {Promise<Boolean>} 
 */
const push = async (QueueUrl: string, MessageGroupId: string, payload: any) => {
  const MessageBody = JSON.stringify(payload);

  const params = {
    QueueUrl,
    MessageBody,
    MessageGroupId
  }

  try {
    await client.send(new SendMessageCommand(params));
    return true;
  } catch (error) {
    console.error(error)
    return false;
  }

}


export default {
  config,
  client,
  exists,
  create,
  getUrl,
  load,
  push
}

