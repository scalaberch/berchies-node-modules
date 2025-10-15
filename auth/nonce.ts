import { generateUUID } from "@modules/strings";
import Cache from "@modules/cache";

export const NONCE_EXPIRY = 300; // 5 minutes
const noncePrefix = "web3nonce";

/**
 * save a nonce string (uuid4) in cache and assign it to a tag
 *
 * @param tag
 * @param prefix
 * @returns
 */
export const issueNonce = (tag: string, prefix = "") => {
  const nonce = generateUUID();
  const currentPrefix = prefix === "" ? noncePrefix : prefix;
  Cache.set(`${currentPrefix}:${tag}`, nonce, { EX: NONCE_EXPIRY });
  return nonce;
};

/**
 * get issued nonce
 *
 * @param tag
 * @param prefix
 * @returns
 */
export const getIssuedNonce = async (tag: string, prefix = "") => {
  const currentPrefix = prefix === "" ? noncePrefix : prefix;
  const nonce = await Cache.get(`${currentPrefix}:${tag}`);
  return !nonce ? "" : nonce;
};

/**
 * clear the nonce data on cache
 *
 * @param tag
 * @param prefix
 * @returns
 */
export const clearNonce = async (tag: string, prefix = "") => {
  const currentPrefix = prefix === "" ? noncePrefix : prefix;
  await Cache.del(`${currentPrefix}:${tag}`);
};


export default {
  clearNonce,
  getIssuedNonce,
  issueNonce
}