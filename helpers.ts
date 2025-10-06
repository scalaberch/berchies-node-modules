import IP from "ip";
import cp from "child_process";
import os from "os";
import crypto from "crypto";
import fs from "fs";
import { hasBadWords } from "./badwords";
import moment from "moment-timezone";
import { timestampFormat } from "./constants";
import axios from "axios";

export const getEnv = () => {
  const env = process.env.ENV || "dev";
  return env;
};

export const getEnvTag = () => {
  const env = getEnv();
  let tag = "";

  if (env === "") {
    tag = "dev";
  } else if (env === "prod" || env === "production") {
    tag = "";
  } else {
    tag = env;
  }

  return `${tag}`;
};

/**
 * gets my ip address
 *
 * @returns
 */
export const getMyIPAddress = () => IP.address();

export const getGitUser = () => {
  const prettyname = ""; // cp.execSync("git config user.name").toString().trim();
  return prettyname;
};

export const getServerName = () => {
  switch (process.platform) {
    case "win32":
      return process.env.COMPUTERNAME;
    case "darwin":
      return cp.execSync("scutil --get ComputerName").toString().trim();
    case "linux":
      // const prettyname = cp.execSync("hostnamectl --pretty").toString().trim();
      const prettyname = cp.execSync("uname -n").toString().trim();
      return prettyname === "" ? os.hostname() : prettyname;
    default:
      return os.hostname();
  }
};

export const encryptToSha256 = (input: any) => {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
};

export const generateRandomString = (length: number) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

export const sleep = (waitTime: number) => {
  return new Promise((res) => {
    setTimeout(() => {
      return res(true);
    }, waitTime);
  });
};

export const sleepRandomly = async (minWaitTime: number, maxWaitTime: number) => {
  const waitTime = randomNumber(minWaitTime, maxWaitTime);
  return await sleep(waitTime);
};

export const promiseReject = (msg: string) => {
  return Promise.reject({ error: msg });
};

export const fetchAllFiles = (
  dir: string,
  files: Array<string> = [],
  except: Array<string> = []
) => {
  const fileList = fs.readdirSync(dir);

  for (const file of fileList) {
    const name = `${dir}/${file}`;

    if (fs.statSync(name).isDirectory()) {
      fetchAllFiles(name, files);
    } else if (!except.includes(name)) {
      files.push(name);
    }
  }

  return files;
};

export const doThisPerpetually = (
  doThis: () => Promise<any> | any,
  startImmediately: boolean = false,
  overrideTickTime?: number
) => {
  let processing = false;
  let started = false;
  let handler: NodeJS.Timeout;
  const tickTime = !isNaN(overrideTickTime) ? overrideTickTime : 100; // tick every 100ms

  // define handler function
  const handlerFunction = async () => {
    // skip condition
    if (processing) {
      return;
    }

    // process.
    processing = true;
    await doThis();
    processing = false;
  };

  // define start function
  const start = () => {
    if (started) {
      return;
    }

    started = true;
    handler = setInterval(handlerFunction, tickTime);
  };

  if (startImmediately) {
    start();
  }

  return {
    handler,
    start,
    stop: () => {
      if (!started) {
        return;
      }
      clearInterval(handler);
    },
  };
};

/**
 * pick a random element from array
 *
 * @param array
 * @returns
 */
export const pickRandomFromArray = (array: any[]) => {
  if (array.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

/**
 * hides middle content of a string with the padded characters showing
 * (i.e. mystring becomes mys...ing)
 *
 * @deprecated
 * @param hash
 * @param padLength
 * @returns
 */
export const hideMiddleOfString = (hash: string, padLength = 4) => {
  const strLen = hash.length;

  if (strLen < padLength + 1) {
    return hash;
  }
  if (strLen < padLength * 2 + 1) {
    return `${hash}...`;
  }

  return `${hash.slice(0, padLength)}...${hash.slice(strLen - padLength)}`;
};

/**
 *
 * @param condition
 * @returns
 */
export const waitUntil = (conditionFn: () => boolean | Promise<boolean>) => {
  const maxWaitingTime = 30; // 30 seconds wait time
  const intervalWaitTime = 1000; // 1 sec wait after executed.
  let condition = true;

  return new Promise(async (res) => {
    let ticks = 0;
    do {
      condition = await conditionFn();

      if (condition) {
        res(true);
        break;
      }

      ticks++;
      if (ticks > maxWaitingTime) {
        res(false);
        break;
      }

      await sleep(intervalWaitTime);
    } while (!condition);
  });
};

/**
 * checks if string is a valid json string.
 *
 * @deprecated
 * @param jsonString
 */
export const isValidJSON = (jsonString: string) => {
  try {
    let json = JSON.parse(jsonString);
    let validity = json && typeof json === "object";
    return validity;
  } catch (e) {
    return false;
  }
};

/**
 *
 * @param value
 * @returns
 */
export const isANumber = (value: any) => {
  return !isNaN(Number(value));
};

/**
 * Generate a url-friendly slug string from an input string
 * (i.e.) Hello World -> hello-world
 *
 * @deprecated
 * @param str
 * @returns {string}
 */
export const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * converts camel case to snake case
 *
 * @deprecated
 * @param str
 * @returns
 */
export const camelCaseToSnakeCase = (str) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * converts snake case to camel case
 *
 * @deprecated
 * @param snakeStr
 * @returns
 */
export const snakeCaseToCamelCase = (snakeStr) =>
  snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * check if string is a snake case
 *
 * @deprecated
 * @param str
 * @returns
 */
export const isStringIsSnakeCase = (str: string) => /^[a-z]+(_[a-z]+)*$/.test(str);

/**
 * capitalizing a string.
 *
 * @param str
 * @returns
 */
export const capitalizeString = (str: string) => {
  if (str.length === 0) {
    return "";
  }
  if (str.length === 1) {
    return str.toUpperCase();
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 *
 * @param num
 * @param fallbackNumber
 * @returns
 */
export const ParseNumber = (num: any, fallbackNumber?: number) => {
  const n = Number(num);
  if (isNaN(n)) {
    return isNaN(fallbackNumber) ? 0 : fallbackNumber;
  }
  return n;
};

/**
 * best used if you delete items from a list based on an input array
 *
 * @param firstArray
 * @param secondArray
 */
export const getMissingItemsOnFirstArrayFromSecondArray = (
  firstArray: Array<any>,
  secondArray: Array<any>
) => {
  return firstArray.length === 0
    ? []
    : firstArray.filter((cue) => !secondArray.includes(cue));
};

/**
 *
 * @param number
 * @param maxPlaces
 * @param append
 * @returns
 */
export const decimalToFixedString = (number: number, maxPlaces = 2, append = "") => {
  const fixedNumber = number.toFixed(maxPlaces);
  const formatted = parseFloat(fixedNumber).toString();
  return `${formatted}${append}`;
};

/**
 * generate a random number from min to max
 *
 * @param min
 * @param max
 * @returns
 */
export const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const stringHasBadWords = (string: string) => hasBadWords(string);

export const getKeyByValue = <T extends Record<string, unknown>>(
  obj: T,
  value: T[keyof T]
): keyof T | undefined =>
  (Object.keys(obj) as (keyof T)[]).find((key) => obj[key] === value);

/**
 * gets the current timestamp with format YYYY-MM-DD HH:mm:ss
 *
 * @returns
 */
export const getCurrentTimestamp = () => moment().format(timestampFormat);

export const remotePathExists = async (path: string) => {
  try {
    await axios.get(path, {
      validateStatus: (status) => status >= 200 && status < 300,
    });
    return true;
  } catch {
    return false;
  }
};

export const parseJSON = (jsonString: string, makeFallbackValueNull = true) => {
  let value = makeFallbackValueNull ? null : {};

  try {
    value = JSON.parse(jsonString);
  } catch (error) {
    console.error(`JSON parsing error: `, error);
  }

  return value;
};

///// put all deprecated functions below

/**
 *
 * @deprecated
 * @param string
 * @returns
 */
export function camelCaseToSentence(string) {
  var result = string.replace(/([A-Z])/g, " $1");
  return result
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.substring(1))
    .join(" "); // .toLowerCase();
}

/**
 * @deprecated
 * @param inputString
 * @returns
 */
export const encodeBase64String = (inputString: string) =>
  Buffer.from(inputString, "utf8").toString("base64");

/**
 * @deprecated
 * @param base64String
 * @returns
 */
export const decodeBase64String = (base64String: string) =>
  Buffer.from(base64String, "base64").toString("utf8");

/**
 *
 * @deprecated
 * @param num
 * @param totalLength
 * @returns
 */
export function padWithZeros(num: number, totalLength: number): string {
  return String(num).padStart(totalLength, "0");
}

/**
 * export default
 *
 */
export default {};
