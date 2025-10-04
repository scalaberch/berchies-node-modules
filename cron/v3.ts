import _ from 'lodash';
import Cron, { ScheduledTask } from 'node-cron';
import { fetchAllFiles, getServerName } from '../helpers';
import fs from 'fs';
import { isProdEnv, env } from '../env';
import config from '../nodeconfig';
import parser from 'cron-parser';

const Jobs = {};
export const jobsPath = './src/jobs';

const init = (appModules) => {
  const module = {
    shutdown,
    startAll,
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

const shutdown = () => {
  const jobsList = Object.keys(Jobs);
  if (jobsList.length === 0) {
    return;
  }

  const jobs: Cron.ScheduledTask[] = Object.values(Jobs);
  for (const job of jobs) {
    job.stop();
  }
};

const startAll = () => {
  const jobsList = Object.keys(Jobs);
  if (jobsList.length === 0) {
    return;
  }

  const jobs: Cron.ScheduledTask[] = Object.values(Jobs);
  for (const job of jobs) {
    job.start();
  }
};

const startInitialization = async (cacheModule, autoStart = true) => {
  // Collect jobs
  const collectedJobs = await collectJobs();
  if (collectedJobs.length === 0) {
    console.warn('cronjobs: No jobs found.');
    return;
  }

  for (const job of collectedJobs) {
    const { name, cron: schedule, task } = job;

    const _task = Cron.schedule(
      schedule,
      async () => {
        const lockKey = `${name}-cronlock`;
        const lockId = await cacheModule.acquireLock(lockKey);
        // console.log('created lock ' + lockId);

        if (lockId) {
          try {
            await task();
          } finally {
            // console.log(`attempt to clear lock: ${lockId}`);
            await cacheModule.releaseLock(lockKey, lockId);
          }
        } else {
          // console.log('Another instance is running the cron, skipping.');
        }

        // if (lockId) {
        //   console.log('Got the lock, running cron...');
        //   try {
        //     await task();
        //   } finally {
        //     await cacheModule.releaseLock(lockKey, lockId);
        //   }
        // } else {
        //   console.log('Another instance is running the cron, skipping.');
        // }

        return;
      },
      {
        name,
        timezone: 'Asia/Manila', // or UTC
        scheduled: false,
      }
    );

    if (autoStart) {
      _task.start();
    }

    Jobs[name] = _task;
  }
};

/**
 * collects all defined jobs found in jobsPath
 *
 * @returns
 */
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
