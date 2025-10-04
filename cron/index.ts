import cron, { ScheduledTask } from "node-cron";
import { fetchAllFiles, getServerName } from "../helpers";
import fs from "fs";
import { isProdEnv, env } from "../env";
import config from "../nodeconfig";

const cronConfigKey = "";
var cronJobs: { [key: string]: cron.ScheduledTask } = {};

/**
 * needs database.
 *
 */
const checkIfSoloMode = async () => {};

/**
 *
 * @param schedule
 * @param job
 */
export const createJob = (schedule: string, job: () => any) => {
  // validate first the schedule
  const isValidSchedule = cron.validate(schedule);
  if (!isValidSchedule) {
    return new Error("Malformed or invalid job schedule.");
  }

  return [schedule, job];
};

/**
 *
 * @returns
 */
const startAll = () => {
  const length = Object.keys(cronJobs).length;
  if (length === 0) {
    return false;
  }

  for (const jobIndex in cronJobs) {
    const job = cronJobs[jobIndex];
    const lockFile = `${process.cwd()}/resources/cache/${jobIndex}.cronlock`;

    // Check if file exists.
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }

    job.start();
  }
};

/**
 *
 * @returns
 */
const stopAll = () => {
  const length = Object.keys(cronJobs).length;
  if (length === 0) {
    return false;
  }

  for (const jobIndex in cronJobs) {
    const job = cronJobs[jobIndex];
    job.stop();
  }
};

/**
 * initialize the cron engine
 *
 * @returns {Boolean}
 */
const init = async () => {
  const jobsPath = "./src/jobs";
  const files: Array<string> = fetchAllFiles(jobsPath, [], ["README.md"]);

  if (files.length === 0) {
    return Promise.resolve(false);
  }

  for (const jobFile of files) {
    const relativeFilePath = jobFile.replace(jobsPath, "");
    const path = `${process.cwd()}/src/jobs${relativeFilePath}`;
    const jobObject = await import(path);

    if (!isValidCronModule(jobObject.default)) {
      continue;
    }
    
    const job = jobObject.default;
    const routeSubPath = jobFile.split("/").pop()?.split(".")[0] || "";
    const rootPath = `${routeSubPath.toLowerCase()}`;
    const lockFile = `${process.cwd()}/resources/cache/${rootPath}.cronlock`;

    // Create a job.
    const jobItem = cron.schedule(
      job[0],
      async () => {
        const fn = job[1];

        // Check if file exists.
        if (fs.existsSync(lockFile)) {
          return false;
        }

        // Write files.
        fs.writeFileSync(lockFile, `${rootPath}`); // Add lock file
        await fn(); // execute it
        fs.unlinkSync(lockFile);

        return true;
      },
      {
        scheduled: true,
        timezone: "UTC",
        name: rootPath,
      }
    );

    cronJobs[rootPath] = jobItem;
  }

  // Execute start logic.
  const hasNoRunner = await hasNoCronRunner();
  if (hasNoRunner) {
    await assignInstanceLock();
  }
  const isLocked = await cronInstanceLocked();
  if (isLocked) {
    startAll();
  }
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
  return (
    importedModule.length === 2 &&
    typeof importedModule[0] === "string" &&
    typeof importedModule[1] === "function"
  );
};

/**
 * check if instance is locked to single mode
 *
 * @returns {Boolean}
 */
const cronInstanceLocked = async () => {
  const hostname = getServerName();

  // Find if the current hostname is assigned to it.
  const savedHostname = await config.getConfig("cronHostname");
  return savedHostname === hostname;
};

/**
 *
 */
const assignInstanceLock = async () => {
  const hostname = getServerName();
  await config.setConfig("cronHostname", hostname);
};

/**
 *
 * @returns
 */
const hasNoCronRunner = async () => {
  const savedHostname = await config.getConfig("cronHostname");
  return savedHostname === null || savedHostname === "";
};

export default {
  createJob,
  startAll,
  stopAll,
  init,
};

/**
 *
 * idea for cron controller
 * - project is deployed on ecs at production
 * - ecs will spawn more than 1 instances
 * - but for all these instances, there must be at most 1 instance that will run the cronjob (if cronjob module is enabled)
 * - controller must use AWS Cache for this
 *
 */
