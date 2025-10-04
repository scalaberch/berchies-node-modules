import { Consumer } from 'sqs-consumer'
import { SQSClient } from '@aws-sdk/client-sqs';

const listeners: object = {};

/**
 * @todo: make it implement this for the object
 */
class Listener {
  private consumer: Consumer;
  private batchCount: number;
  private batchRecieveHandler : undefined | ((messages, batchCount? :number) => any | Promise<any>);

  constructor(groupId, queueUrl, sqs) {
    this.batchCount = 1;

    this.consumer = Consumer.create({
      queueUrl,
      sqs,
      batchSize: 10,
      waitTimeSeconds: 10,
      pollingWaitTimeMs: 5000,
      attributeNames: ['All'],
      shouldDeleteMessages: true, // this means, if message is acknowledged, it'll be deleted automatically
      handleMessageBatch: async messages => {
        if (typeof this.batchRecieveHandler === 'function') {
          const filtered = messages.filter( msg => msg.Attributes.MessageGroupId === groupId );
          const resultHandle = await this.batchRecieveHandler(filtered, this.batchCount++)
          return Array.isArray(resultHandle) ? resultHandle : [];
        }
        return []; // do not acknowledge whatever gets in if the batchRecieveHandler doesnt have a hander
        
      },
      handleMessage: async message => {
        console.log("from single:")
        console.log(message);
        return {}; // dont acknowledge
      }
    });

    this.consumer.on('error', (err) => console.error(err.message));
    this.consumer.on('processing_error', (err) => console.error(err.message));
  }

  start() { this.consumer.start(); }
  stop (abort?: boolean) { this.consumer.stop({ abort }); }
  isRunning() { return this.consumer.isRunning }

  onBatchReceive(handler: (messages, batchCount? :number) => any | Promise<any>) {
    this.batchRecieveHandler = handler;
  }


}

/**
 * 
 * @param groupId 
 * @returns 
 */
const exists = (groupId: string) => listeners.hasOwnProperty(groupId);

/**
 * 
 * @param groupId 
 * @param queueUrl 
 * @param sqs 
 * @param defaultHandleMessage 
 * @returns 
 */
const create = (groupId: string, queueUrl: string, sqs: SQSClient, defaultHandleMessage?: (message) => any) => {

  const listener = new Listener(groupId, queueUrl, sqs);

  return listener
}

/**
 * 
 * @param groupId 
 * @returns 
 */
const get = (groupId: string) => exists(groupId) ? listeners[groupId] : null;



export default {
  create, exists, get
};