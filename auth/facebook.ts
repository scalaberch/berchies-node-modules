import _ from "lodash";
import moment from "moment-timezone";
import cache from "@modules/cache";
import { getEnvVariable as getEnv } from "../env";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const fbVersion = `v17.0`;

export const APP_ID: string = getEnv("FACEBOOK_APP_ID", false, "");
export const APP_SECRET: string = getEnv("FACEBOOK_APP_SECRET", false, "");
export const REDIRECT_URI: string = getEnv("FACEBOOK_REDIRECT_URI", false, "");

interface BaseFbUser {
  id: string;
  name: string;
  email: string;
}

export interface FbUser extends BaseFbUser {}

/**
 *
 * @returns
 */
const generateAuthUrl = () => {
  const redirectUri = encodeURIComponent(REDIRECT_URI);
  const fbAuthUrl = `https://www.facebook.com/${fbVersion}/dialog/oauth?client_id=${APP_ID}&redirect_uri=${redirectUri}&state=123&scope=email,public_profile`;
  return fbAuthUrl;
};

/**
 *
 * @param code
 * @returns
 */
const getTokenResponse = async (code: string) => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/${fbVersion}/oauth/access_token`,
      {
        params: {
          client_id: APP_ID,
          client_secret: APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        },
      }
    );

    const accessToken: string = data?.access_token ?? "";
    return accessToken;
  } catch (err) {
    console.error(err);
    return "";
  }
};

/**
 *
 * @param accessToken
 * @returns
 */
const getAuthUser = async (accessToken = ""): Promise<FbUser> => {
  try {
    const userResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });

    return userResponse?.data ?? {};
  } catch (err) {
    console.error(err);
    return null;
  }
};

export default {
  generateAuthUrl,
  getTokenResponse,
  getAuthUser,
};
