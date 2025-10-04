import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { getMyIPAddress, getGitUser, getServerName } from "../helpers";
import { logLevels, logStreams, getLogStreamLevel } from "./defines";
import TransactionLog, { enableTransactionLog } from "./transaction";

/**
 * define constants
 */
const env = process.env.ENV || "";
const disableLogFlag = parseInt(process.env.EBG_LOGGER_DISABLE_LOG || "") == 1;
const enableLogging: boolean = disableLogFlag ? false : true;
const client: any = new CloudWatchLogsClient({
  region: process.env.AWS_DEFAULT_REGION,
});
let sourceData: any = {};
export const logGroupName = `/ebg/application/${
  process.env.EBG_LOGGER_GROUP_NAME || "ebg"
}`;
export const logGroupRetentionDays: number =
  parseInt(process.env.EBG_LOGGER_GROUP_RETENTION_DAYS || "") || 30;

/**
 * initialize the logger system
 */
const init = async () => {
  if (!enableLogging) {
    return Promise.resolve({});
  }

  // Check if log group has been created
  const doesLogGroupExist = await isLogGroupExists(logGroupName);
  if (!doesLogGroupExist) {
    // if not, then create it dynamically.
    await createLogGroup(logGroupName, logGroupRetentionDays);
  }

  // Then check for all log streams if already created.
  for (const streamKey in logStreams) {
    // Check if log stream has already
    const logStreamType = logStreams[streamKey];
    const logStream = `${logStreamType}/${env}`;
    const doesLogStreamExist = await isLogStreamExists(logGroupName, logStream);
    if (!doesLogStreamExist) {
      // if not, then create it dynamically.
      await createLogStream(logGroupName, logStream);
    }
  }

  // Check for transaction logs
  if (enableTransactionLog) {
    await TransactionLog.init();
  }

  // Set the source data.
  sourceData = await generateSourceData();

  // Override the native actions
  overrideNativeLogging();

  return Promise.resolve(LoggerObject);
};

/**
 * override specific native console logging
 *
 */
const overrideNativeLogging = () => {
  const _consoleLog = console.log;
  const _consoleError = console.error;
  const _consoleWarn = console.warn;

  // console.log(_console);
  console.error = async function (...args) {
    _consoleError.apply(console, args);

    // Send asynchronously to cloudwatch
    if (enableLogging) {
      const message = args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ");
      error(message, {}, false);
    }
  };

  console.log = async function (...args) {
    _consoleLog.apply(console, args);

    // Send asynchronously to cloudwatch
    if (enableLogging) {
      const message = args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ");
      info(message, {}, false);
    }
  };
};

/**
 * check if log group exists.
 *
 */
const isLogGroupExists = async (
  logGroupName: string = ""
): Promise<boolean> => {
  const cmd = new DescribeLogGroupsCommand({
    logGroupNamePrefix: logGroupName,
  });
  const response = await client.send(cmd);
  return response.logGroups.length > 0;
};

/**
 * create log group
 *
 */
const createLogGroup = async (
  logGroupName: string = "",
  retentionInDays: number = 120,
  kmsKeyId: string = ""
): Promise<void> => {
  // Create the log group
  const createCommand = new CreateLogGroupCommand({ logGroupName });
  await client.send(createCommand);

  // Then set the retention policy.
  const rententionCommand = new PutRetentionPolicyCommand({
    logGroupName,
    retentionInDays,
  });
  await client.send(rententionCommand);
};

/**
 * check if log stream exists.
 */
const isLogStreamExists = async (
  logGroupName: string = "",
  logStreamName: string = ""
): Promise<boolean> => {
  const cmd = new DescribeLogStreamsCommand({
    logGroupName,
    logStreamNamePrefix: logStreamName,
  });
  const response = await client.send(cmd);
  return response.logStreams.length > 0;
};

/**
 * create log stream
 */
const createLogStream = async (
  logGroupName: string = "",
  logStreamName: string = ""
) => {
  // Create the log group
  const createCommand = new CreateLogStreamCommand({
    logGroupName,
    logStreamName,
  });
  await client.send(createCommand);
};

/**
 * Get server source data.
 *
 * @returns object
 */
const generateSourceData = async () => {
  const source = {
    env,
    ipAddress: getMyIPAddress(),
    user: "",
    hostname: getServerName(),
    platform: process.platform,
  };
  if (env === "dev") {
    source.user = await getGitUser();
  }
  return source;
};

/**
 *
 * @param severity
 * @param message
 * @param payload
 */
const log = async (
  severity: number,
  message: string,
  payload: any,
  logToScreen: boolean = false
) => {
  if (!enableLogging) {
    return Promise.resolve();
  }

  const logStreamType = getLogStreamLevel(severity); // logStreams[streamKey];
  const logStreamName = `${logStreamType}/${env}`;
  let logPayload: any;

  if (severity === logLevels.HTTP) {
    logPayload = {
      request: message,
      ...payload,
      server: sourceData,
    };
  } else {
    logPayload = {
      message,
      payload,
      source: sourceData,
    };
  }

  // Send the log entry.
  const messageString = JSON.stringify(logPayload);
  const cmd = new PutLogEventsCommand({
    logGroupName,
    logStreamName,
    logEvents: [
      {
        timestamp: Date.now(),
        message: messageString,
      },
    ],
  });

  // Send the actual command.
  try {
    await client.send(cmd);
  } catch (err) {
    console.error(err);
  }

  // Get a fallback to log to screen (if needed)
  if (logToScreen) {
    // switch (severity) {
    //   case logLevels.ERROR:
    //     console.error(message, payload);
    //     break;
    //   case logLevels.WARNING:
    //     console.warn(message, payload);
    //     break;
    //   default:
    //     console.log(message, payload);
    // }
  }

  return Promise.resolve();
};

/**
 *
 * @param message
 */
export const write = async (
  message: string,
  logToScreen: boolean = false,
  streamName = ""
) => {
  const logStreamType = getLogStreamLevel(logLevels.INFO); // logStreams[streamKey];
  const logStreamName =
    streamName.length === 0 ? `${logStreamType}/${env}` : streamName;

  // Send the log entry.
  const cmd = new PutLogEventsCommand({
    logGroupName,
    logStreamName,
    logEvents: [
      {
        timestamp: Date.now(),
        message,
      },
    ],
  });

  // Send the actual command.
  try {
    await client.send(cmd);
  } catch (err) {
    console.error(err);
  }

  if (logToScreen) {
    console.log(message);
  }
};

/**
 * Wrapper functions
 *
 * @param message
 * @param payload
 * @returns
 */
const info = async (
  message: string,
  payload: any,
  logToScreen: boolean = false
) => await log(logLevels.INFO, message, payload, logToScreen);
const warning = async (
  message: string,
  payload: any,
  logToScreen: boolean = false
) => await log(logLevels.WARNING, message, payload, logToScreen);
const error = async (
  message: string,
  payload: any,
  logToScreen: boolean = false
) => await log(logLevels.ERROR, message, payload, logToScreen);
const http = async (
  message: string,
  payload: any,
  logToScreen: boolean = false
) => await log(logLevels.HTTP, message, payload, logToScreen);

/**
 * external usage for custom log stream.
 *
 * @param groupName
 */
export const createCustomLogStream = async (logStream: string) => {
  const doesLogStreamExist = await isLogStreamExists(logGroupName, logStream);
  if (!doesLogStreamExist) {
    await createLogStream(logGroupName, logStream);
  }
};

const LoggerObject = {
  log,
  info,
  warning,
  error,
  init,
  http,
  write,

  createCustomLogStream,
};

export default LoggerObject;
