import _ from 'lodash';
import { fetchAllFiles, getServerName } from '../helpers';
import Bree from 'bree';
import parser from 'cron-parser';

export const jobsPath = './src/jobs';
let bree: Bree;
let _jobs = [];

const collectJobs = async () => {
  const jobs = [];
  const cwd = process.cwd();
  const files: Array<string> = fetchAllFiles(jobsPath, [], ['README.md']);

  if (files.length === 0) {
    return jobs;
  }

  for (const jobFile of files) {
    const relativeFilePath = jobFile.replace(jobsPath, '');
    const path = `${cwd}/src/jobs${relativeFilePath}`;
    const jobObject = await import(path);

    if (!isValidCronModule(jobObject.default)) {
      continue;
    }

    const [cron, task] = jobObject.default;
    const routeSubPath = jobFile.split('/').pop()?.split('.')[0] || '';
    const name = `${routeSubPath.toLowerCase()}`;

    jobs.push({
      name,
      cron,
      task,
    });
  }

  return jobs;
};

const init = (appModules) => {
  // Create bree modules
  bree = new Bree({});

  // create the module
  const module = {
    shutdown: () => {
      bree.stop();
    },
    start: () => {},
  };

  // Check if cache is enabled.
  if (!appModules.hasOwnProperty('cache')) {
    console.error('cronjobs: Cache is not enabled. Please enable cache for cronjobs to work.');
    return module;
  }

  // Prepare cache service
  const cacheModule = _.get(appModules, 'cache');
  startInitialization(cacheModule);

  // Return module immediately
  return module;
};

const startInitialization = async (cacheModule) => {
  // Collect jobs
  const collectedJobs = await collectJobs();
  if (collectedJobs.length === 0) {
    console.warn('cronjobs: No jobs found.');
    return;
  }

  const jobs = collectedJobs.map((job) => {
    const { name, cron, task } = job;
    return {
      name,
      // cron,
      // cron: '0 0 1 * *',
      // cronValidate: {},
      // interval: 'every 2 minutes',
      fn: async () => {
        const lockKey = `${name}--lock`;
        try {
          const lock = await cacheModule.createLock(lockKey, 30000);
          console.log('✅ Lock acquired. Running job...');

          // your task here...
          await task();

          await lock.release();
          console.log('✅ Lock released.');
        } catch (err: any) {
          if (err.name === 'LockError') {
            console.log('⛔ Lock not acquired. Skipping job.');
          } else {
            console.error('🔥 Unexpected error:', err);
          }
        }
      },
    };
  });

  // re-initialize bree here
  bree = new Bree({
    logger: false,
    jobs,
    // root: false,
  });

  // // then we start it!
  // await bree.start();
};

/**
 * checks if a cron module imported is a valid cron "object"
 *
 * @returns {Boolean}
 */
export const isValidCronModule = (importedModule: any) => {
  if (!Array.isArray(importedModule)) {
    return false;
  }
  return importedModule.length === 2 && typeof importedModule[0] === 'string' && typeof importedModule[1] === 'function';
};

/**
 *
 * @param schedule
 * @param job
 */
export const createJob = (schedule: string, job: () => any) => {
  // validate first the schedule
  const isValidSchedule = isValidCron(schedule);
  if (!isValidSchedule) {
    return new Error('Malformed or invalid job schedule.');
  }

  return [schedule, job];
};

/**
 *
 * @param cron
 * @returns
 */
const isValidCron = (cron: string): boolean => {
  try {
    parser.parseExpression(cron);
    return true;
  } catch {
    return false;
  }
};

export default {
  init,
};
