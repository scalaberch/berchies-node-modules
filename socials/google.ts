import axios from "axios";
import { getEnvVar } from "@modules/env";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuid } from "uuid";

const clientId = getEnvVar("GOOGLE_OAUTH_CLIENT_ID", false, "");
const clientSecret = getEnvVar("GOOGLE_OAUTH_CLIENT_SECRET", false, "");
const redirectUrl = getEnvVar("GOOGLE_OAUTH_REDIRECT_URL", false, "");

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

export const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);

/**
 * generates the redirect url to be sent over for oauth via google
 *
 * @returns
 */
const getOauthRedirectUrl = (
  scope: string[] = ["openid", "profile", "email"],
  access_type: AuthUrlAccessType = AuthUrlAccessType.online,
  prompt: AuthUrlPrompt = AuthUrlPrompt.selectAccount,
  state: string = ""
) => {
  if (state.length === 0) {
    state = uuid();
  }

  const url = oauth2Client.generateAuthUrl({
    access_type,
    scope,
    prompt, // optional
    state
  });

  return url;
};

/**
 * get auth tokens from code
 *
 * @param code
 * @returns
 */
const getAuthTokensFromCode = async (code: string) => {
  try {
    const dataset = await oauth2Client.getToken(code);
    console.log(dataset);

    const { tokens } = dataset;
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
const getUserDataFromIdToken = async (idToken: string) => {
  // Verify the ID token
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    return null;
  }

  return payload
};

/**
 *
 * @deprecated
 * @param code
 */
const fetchUserProfileViaCodeLegacy = async (code: any) => {
  try {
    // Exchange authorization code for access token
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      // redirect_uri: baseRedirectUri,
      grant_type: "authorization_code",
    });

    const { access_token, id_token } = data;
    // Use access_token or id_token to fetch user profile
    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // Fetch profile data.
    return Promise.resolve(profile);
  } catch (error) {
    // console.log(error); // @todo: add to logger
    return Promise.reject(error.response.data);
  }
};

const fetchUserProfileViaCode = async (code: any) => {
};

export default {
  getOauthRedirectUrl,
  fetchUserProfileViaCode,
  getAuthTokensFromCode,
  getUserDataFromIdToken
};
