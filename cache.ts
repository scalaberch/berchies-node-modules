import { env, getEnv } from './env';
import { createClient, RedisClientType } from 'redis';
import ohash from 'object-hash';
import { Request } from 'express';
import zlib from 'zlib';
import { getAppInstance } from './server/index';
import Redlock from 'redlock';
import { v4 as uuidv4 } from 'uuid';
import { getEnvVariable } from '@modules/env';

const _host = env.REDIS_HOST || '127.0.0.1';
const _user = env.REDIS_USER || '';
const _pass = env.REDIS_PASSWORD || '';
const _port = parseInt(env.REDIS_PORT) || 6379;

let _client;
let _lock: Redlock;

const _env = getEnv();
const _defaultLockTime = 120000; // 2 minutes
const lockPrefix = `ebg_lock-${getEnvVariable('PROJ_NAME')}:`;

const getCache = () => {
  const cacheObject = getAppInstance('cache');
  if (cacheObject === null) {
    return null;
  }
  return cacheObject._client;
};

const getLockHandler = () => _lock;

/**
 * auto-generates the redis url
 *
 * @returns {string}
 */
const generateUrl = (): string => {
  // let credentials = [REDIS_USER, REDIS_PASSWORD].join('@');
  const hasUser = _user.length > 0;
  const credentials = `${hasUser ? _user : ''}${_pass.length > 0 ? `${hasUser ? ':' : ''}${_pass}` : ''}`;
  const url = `redis://${credentials.length > 0 ? `${credentials}@` : ''}${_host}:${_port}`;
  return url;
};

/**
 * initialize the cache
 *
 * @returns
 */
const init = async () => {
  try {
    // create redis client
    const url = generateUrl();
    _client = createClient({ url });

    // create lock client
    _lock = new Redlock([_client], {
      driftFactor: 0.01, // recommended drift factor
      retryCount: 20,
      retryDelay: 400,
      retryJitter: 200,
    });

    // do connect
    await _client.connect();
  } catch (err) {
    return Promise.reject(err);
  }

  return { _client, isCacheActive, shutdown, createLock, acquireLock, releaseLock };
};

/**
 * shutdown instance
 *
 */
const shutdown = async () => {
  const _cache = getCache();
  if (isCacheActive()) {
    _cache.shutdown();
  }
};

/**
 * create lock
 *
 * @param lockKey
 * @param timeout
 * @returns
 */
const createLock = async (lockKey: string, timeout = _defaultLockTime) => {
  return await getLockHandler().acquire([lockKey], timeout);
};

/**
 * creates a redis key from an express request object
 *
 * @param request
 */
const requestToKey = (request: Request) => {
  const reqDataToHash = {
    query: request.query,
    body: request.body,
  };
  return `${request.path}@${ohash.sha1(reqDataToHash)}`;
  // return `${_env}:${request.path}@${ohash.sha1(reqDataToHash)}`;
};

/**
 * check if active is online/active or not
 *
 * @returns {Boolean}
 */
const isCacheActive = () => {
  const _cache = getCache();
  return _cache === null ? false : _cache.isOpen;
};

// const isCacheActive = () => !!_client?.isOpen;
// zlib.deflateSync('ddd').toString("base64");

// set a key in the cache
const set = async (key: string, data: any, options: any = {}) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }
  return await _cache.set(key, data, options);
};

// set a key for an object
const setObject = async (key: string, value: any) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }

  return await _cache.hSet(key, value);
};

const setObjectExpiry = async (key: string, seconds: number = 60) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }

  return await _cache.expire(key, seconds);
};

// get a key from the cache
const get = async (key: string) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }

  return await _cache.get(key);
};

const getAllObjects = async (key: string) => {
  const objects = [];
  const _cache = getCache();

  if (!isCacheActive()) {
    return objects;
  }

  const keys = await _cache.keys(`${key}*`);
  for (const key of keys) {
    const data = await _cache.hGetAll(key);
    objects.push({ id: key, ...data });
  }

  return objects;
};

// does key exists
const keyExists = async (key: string) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }

  const exists = await _cache.exists(key);
  return exists !== null;
};

// delete a key from the cache
const del = (key: string) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return false;
  }

  return _cache.del(key);
};

const countHashKeys = async (pattern = '*') => {
  let cursor = 0;
  let count = 0;

  const _cache = getCache();
  if (!isCacheActive()) {
    return count;
  }

  do {
    const { cursor: nextCursor, keys } = await _cache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = Number(nextCursor);
    for (const key of keys) {
      const type = await _cache.type(key);
      if (type === 'hash') count++;
    }
  } while (cursor !== 0);

  return count;
};

/**
 * create a lock
 *
 * @param key
 * @param ttlMs
 * @returns
 */
const acquireLock = async (key: string, ttlMs = _defaultLockTime) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return null;
  }

  const lockId = uuidv4();
  const lockKey = `${lockPrefix}${key}`;
  const success = await _cache.set(lockKey, lockId, {
    NX: true, // only set if key doesn't exist
    PX: ttlMs, // lock auto-expires after TTL
  });

  return success ? lockId : null;
};

const releaseLock = async (key, lockId) => {
  const _cache = getCache();
  if (!isCacheActive()) {
    return null;
  }

  const lockKey = `${lockPrefix}${key}`;
  // const value = await _cache.get(lockKey);
  // if (value === lockId) {
  //   await _cache.del(lockKey);
  // }

  // Lua script ensures we only delete if lock is still ours
  const lua = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await _cache.eval(lua, { keys: [lockKey], arguments: [lockId] });
};

export default {
  init,
  isCacheActive,
  set,
  get,
  del,
  keyExists,
  setObject,
  setObjectExpiry,
  getAllObjects,
  shutdown,
  countHashKeys,
  createLock,

  acquireLock,
  releaseLock,
};

/**
 * https://semaphoreci.medium.com/build-a-caching-layer-in-node-js-with-redis-966509563133
 * 
 * redisClient.set(key, data, options)
 * options:
 * {
    EX, // the specified expire time in seconds
    PX, // the specified expire time in milliseconds
    EXAT, // the specified Unix time at which the key will expire, in seconds
    PXAT, // the specified Unix time at which the key will expire, in milliseconds
    NX, // write the data only if the key does not already exist
    XX, // write the data only if the key already exists
    KEEPTTL, // retain the TTL associated with the key
    GET, // return the old string stored at key, or "undefined" if key did not exist
    }
 * 
 * 
 */
