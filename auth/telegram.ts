import crypto from 'crypto'

export interface InitData {
  query_id: string;
  user?: string | InitDataUser;
  auth_date: number | string;
  hash: string;
  signature: string;
}

export interface InitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

/**
 * extracts the init data string into expected object
 * 
 * @param initDataString 
 * @returns 
 */
const extractInitData = (initDataString: string) => {
  const params = new URLSearchParams(initDataString);
  const data: InitData = Object.fromEntries(params.entries()) as unknown as InitData;
  return data;
}

/**
 * validate the init data auth signature
 * 
 * @param initData 
 * @param botToken 
 * @returns 
 */
const verifyAuthSignature = (initData: InitData, botToken: string) => {
  const { hash } = initData;

  // Sort and build data_check_string
  const dataCheckArr = [];
  Object.keys(initData).forEach((key) => {
    if (key !== "hash") {
      dataCheckArr.push(`${key}=${initData[key]}`);
    }
  })

  // merge to 
  const dataCheckString = dataCheckArr.sort().join("\n");

  // Create secret key
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Calculate HMAC
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Compare
  return hmac === hash;
}




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
}


/**
 * 
 * @deprecated
 * @param initData 
 * @param botToken 
 * @returns 
 */
export const checkTelegramAuth = (initData: string, botToken: string) => {
  // Parse query-string style initData into an object
  const params = new URLSearchParams(initData);

  // Extract the hash
  const hash = params.get("hash");
  params.delete("hash");

  // Sort and build data_check_string
  const dataCheckArr = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  // Create secret key
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Calculate HMAC
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Compare
  return hmac === hash;
}

export default {
  checkTelegramAuth,
  getUserFromInitData,


  extractInitData,
  verifyAuthSignature
}