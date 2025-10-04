import {
  isProductionEnv,
  passportRedirectUrl,
  passportClientId,
  apiKey,
  publishableKey,
  chainName,
  defaultGasOverride,
  chains,
} from "./defines";
import axios, { Axios } from "axios";

/**
 * get nfts of a wallet address using stark x
 *
 * @param walletAddress
 * @param contractAddress
 * @param countPerPage
 * @param nextCursor
 * @param overrideProduction
 */
const getNfts = async (
  walletAddress: string,
  contractAddress: string,
  countPerPage = 10,
  nextCursor = "",
  overrideProduction = false
) => {
  const isProd = overrideProduction ? true : isProductionEnv;
  const endpointUrl = isProd
    ? `https://api.immutable.com/v1/assets`
    : `https://api.sandbox.immutable.com/v1/assets`;

  if (!contractAddress) {
    return null;
  }

  const params = {
    user: walletAddress,
    collection: contractAddress,
    page_size: countPerPage,
  };

  if (nextCursor.length > 0) {
    params["cursor"] = nextCursor;
  }

  const options = {
    method: "GET",
    url: endpointUrl,
    params,
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    return null;
  }
};


export default {
  getNfts
};
