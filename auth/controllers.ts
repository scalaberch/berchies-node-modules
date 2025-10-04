import { Request, Response } from "express";
import { redirectToUrl, outputSuccess } from "../http/handlers";
import Google from "../socials/google";
import Discord from "../socials/discord";
import { env } from "../env";
import { getAuthBearerToken } from "./index";
import { v4 as uuidv4 } from "uuid";

export const FRONTEND_URL = env.FRONTEND_URL || "https://eyeball.games/";
export const LOGIN_URL = env.LOGIN_URL || "https://login.eyeball.games/";

/**
 * google: redirects to oauth page to do the login
 *
 * @param req
 * @param res
 * @returns
 */
const googleOauthRedirect = (req: Request, res: Response) => {
  return redirectToUrl(res, Google.getOauthRedirectUrl());
};

/**
 * google: callback handler used to fetch dataset.
 *
 * @param req
 * @param res
 */
const googleOauthCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  Google.fetchUserProfileViaCode(code)
    .then((userProfile) => {
      // Do logic in registering/logging in the user

      // Then redirect back to url
      return outputSuccess(res, "", userProfile);
    })
    .catch((err) => {
      const uri = `?error=auth&provider=google&errorType=${err.error}&description=${err.error_description}`;
      return redirectToUrl(res, `${LOGIN_URL}${uri}`);
    });
};

/**
 *
 * @param req
 * @param res
 */
const discordOauthRedirect = (req: Request, res: Response) => {
  // const token = getAuthBearerToken(req);
  const token = uuidv4(); // getAuthBearerToken(req);
  return redirectToUrl(res, Discord.generateAuthURL(token));
};

/**
 *
 * @param req
 * @param res
 */
const discordOauthCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  Discord.fetchUserData(code)
    .then(async (userProfile) => {
      const { id, username, global_name, _accessToken, email, verified } =
        userProfile;

      // Run some further checks.
      const isUserJoined = await Discord.hasJoinedEbg(_accessToken);
      if (!isUserJoined) {
        const uri = `?error=auth&provider=discord&errorType=not_joined&description=user not joined`;
        return redirectToUrl(res, `${LOGIN_URL}${uri}`);
      }

      // Do logic in registering/logging in the user

      // Then redirect back to url
      return outputSuccess(res, "", userProfile);
    })
    .catch((err) => {
      const uri = `?error=auth&provider=discord&errorType=${err.code}&description=${err.message}`;
      return redirectToUrl(res, `${LOGIN_URL}${uri}`);
    });
};

export default {
  googleOauthRedirect,
  googleOauthCallback,
  discordOauthRedirect,
  discordOauthCallback,
};
