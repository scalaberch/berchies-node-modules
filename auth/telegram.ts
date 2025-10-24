import crypto from "crypto";
import { User as TelegramBotUser } from "node-telegram-bot-api";

import {
  validate,
  parse,
  isSignatureInvalidError,
  isSignatureMissingError,
  isAuthDateInvalidError,
  isExpiredError,
} from "@telegram-apps/init-data-node";

export interface InitDataLegacy {
  query_id: string;
  user?: string | InitDataUser;
  auth_date: number | string;
  hash: string;
  signature: string;
}

export interface InitDataUser extends TelegramBotUser {
  id: number;
  first_name: string;
  last_name?: string;
  username: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
  is_bot: boolean;
}

export interface ParsedInitData {
  hash?: string;
  signature?: string;
  user?: Partial<TelegramBotUser>;
  authDate?: Date | string;
  chatType?: string;
  chatInstance?: string;
}

/**
 * extracts the init data string into expected object
 *
 * @deprecated
 * @param initDataString
 * @returns
 */
const extractInitData = (initDataString: string) => {
  const params = new URLSearchParams(initDataString);
  const data: InitDataLegacy = Object.fromEntries(
    params.entries()
  ) as unknown as InitDataLegacy;
  return data;
};

/**
 * validate the init data auth signature
 *
 * @deprecated
 * @param initData
 * @param botToken
 * @returns
 */
const verifyAuthSignature = (initData: InitDataLegacy, botToken: string) => {
  if (!initData?.hash) {
    return false;
  }

  // Sort and build data_check_string
  const dataCheckArr = [];
  Object.keys(initData).forEach((key) => {
    if (key !== "hash") {
      dataCheckArr.push(`${key}=${initData[key]}`);
    }
  });
  const dataCheckString = dataCheckArr.sort().join("\n");

  // const urlParams = new URLSearchParams(initData);
  // const hash = urlParams.get("hash");
  // if (!hash) return false;

  // // Remove hash from data
  // urlParams.delete("hash");

  // // Sort params alphabetically and form data_check_string
  // const dataCheckString = Array.from(urlParams.entries())
  //   .sort(([a], [b]) => a.localeCompare(b))
  //   .map(([k, v]) => `${k}=${v}`)
  //   .join("\n");

  // console.log(dataCheckString);

  // // Create secret key
  // const secretKey = crypto
  //   .createHash("sha256")
  //   .update(botToken)
  //   .digest();

  // // Compute HMAC of data_check_string
  // const computedHash = crypto
  //   .createHmac("sha256", secretKey)
  //   .update(dataCheckString)
  //   .digest("hex");

  // console.log(botToken);

  // return computedHash === hash;

  return false;

  // const { hash } = initData;

  // // Sort and build data_check_string
  // const dataCheckArr = [];
  // Object.keys(initData).forEach((key) => {
  //   if (key !== "hash") {
  //     dataCheckArr.push(`${key}=${initData[key]}`);
  //   }
  // });

  // // merge to
  // const dataCheckString = dataCheckArr.sort().join("\n");

  // // Create secret key
  // // const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  // const secretKey = crypto.createHash("sha256").update(botToken).digest();

  // // Calculate HMAC
  // const hmac = crypto
  //   .createHmac("sha256", secretKey)
  //   .update(dataCheckString)
  //   .digest("hex");

  // console.log(`hmac: ${hmac}`);
  // console.log(`hash: ${hash}`);

  // // Compare
  // return hmac === hash;
};

/**
 *
 * @deprecated
 * @param initData
 * @returns
 */
export const getUserFromInitData = (initData: string) => {
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));
  return user;
};

/**
 *
 * @deprecated
 * @param initData
 * @param botToken
 * @returns
 */
export const checkTelegramAuth = (initData: string, botToken: string) => {
  const cStr = "WebAppData";
  const hashStr = "db08ec73c7ebb04c93c89fb3d8068462192e5b2ee71dd0f3367ba46e421d3927";

  const sortedData = initData
    .split("&")
    .filter((chunk) => !chunk.startsWith("hash="))
    .map((chunk) => chunk.split("="))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${decodeURIComponent(value)}`)
    .join("\n");

  // Create secret key
  const secretKey = new Uint8Array(
    crypto.createHmac("sha256", cStr).update(botToken).digest()
  );

  // Generate the data check hash
  const dataCheck = crypto
    .createHmac("sha256", new Uint8Array(secretKey))
    .update(sortedData)
    .digest("hex");

  return dataCheck === hashStr;
};

/**
 * verify init string
 *
 * @param initDataString
 * @param botToken
 * @returns
 */
export const verifyInitString = (initDataString: string, botToken: string) => {
  let isValid = true;
  let message = "";

  try {
    validate(initDataString, botToken);
  } catch (error) {
    if (isSignatureInvalidError(error)) {
      message = "Signature is invalid.";
    } else if (isSignatureMissingError(error)) {
      message = "Signature is missing.";
    } else if (isAuthDateInvalidError(error)) {
      message = "Auth date is invalid.";
    } else if (isExpiredError(error)) {
      message = "Init data has already expired.";
    } else {
      message = "Could not validate init string.";
    }

    isValid = false;
  }

  return { isValid, message };
};

/**
 *
 * @param initDataString
 * @returns
 */
export const extractData = (initDataString: string): ParsedInitData => {
  let data: ParsedInitData = {

  };

  try {
    const config = {
      checkHash: true,
      token: process.env.BOT_TOKEN!,
    };

    data = parse(initDataString);
  } catch (err) {
    console.error(err);
  }

  return data;
};

export default {
  checkTelegramAuth,
  getUserFromInitData,
  extractInitData,

  verifyAuthSignature,
  verifyInitString,
};

export { TelegramBotUser };
