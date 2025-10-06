import { getEnvVar } from "@modules/env";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuid } from "uuid";

export const clientId = getEnvVar("GOOGLE_OAUTH_CLIENT_ID", false, "");
export const clientSecret = getEnvVar("GOOGLE_OAUTH_CLIENT_SECRET", false, "");
export const redirectUrl = getEnvVar("GOOGLE_OAUTH_REDIRECT_URL", false, "");

export enum AuthUrlAccessType {
  offline = "offline",
  online = "online",
}

export enum AuthUrlPrompt {
  none = "none",
  consent = "consent",
  selectAccount = "select_account",
  login = "login",
}

export interface CallbackParam {
  code?: string;
  state?: string;
}

export interface GenerateAuthUrlParams {
  scope?: string[];
  access_type?: AuthUrlAccessType;
  prompt?: AuthUrlPrompt;
  state?: string;
}

export class OAuthCallbackError extends Error {}

/**
 * the oauth client from google-auth-library
 *
 */
const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);

/**
 * gets the oauth client
 *
 * @returns
 */
const getOauthClient = () => oauth2Client;

/**
 * generates the redirect url to be sent over for oauth via google
 *
 * @returns
 */
export const getOauthRedirectUrl = (
  scope: string[] = ["openid", "profile", "email"],
  access_type: AuthUrlAccessType = AuthUrlAccessType.online,
  prompt: AuthUrlPrompt = AuthUrlPrompt.selectAccount,
  state: string = ""
) => {
  const url = oauth2Client.generateAuthUrl({
    access_type,
    scope,
    prompt, // optional
    state,
  });

  return url;
};

/**
 * get auth tokens from code
 *
 * @param code
 * @returns
 */
export const getAuthTokensFromCode = async (code: string) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return Promise.resolve(tokens);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * gets user data from id token generated
 * @todo: handle errors
 *
 * @param idToken
 * @returns
 */
export const getUserDataFromIdToken = async (idToken: string) => {
  // Verify the ID token
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    return null;
  }

  return payload;
};

export const handleCallback = (callbackInput: CallbackParam) => {
  return Promise.reject(new OAuthCallbackError());
  // return Promise.resolve({});
};

export default {
  getOauthClient,
  getOauthRedirectUrl,
  getAuthTokensFromCode,
  getUserDataFromIdToken,
  handleCallback,
};
