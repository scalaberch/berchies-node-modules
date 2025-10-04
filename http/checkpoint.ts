import { Express } from "express";
import { output } from "./handlers"
import config from "../nodeconfig";
import { generateRandomString } from "../helpers"
import _ from 'lodash'
import { EBGRequest, EBGResponse } from "./interfaces";
import maintenance from "@modules/server/maintenance";

const { env } = process;
export const ConfigKey  = 'checkpointPassword'
export const CookieKey  = 'ebgSession';
export const CookieLife = 120;  // 2 hours

/**
 * handles the password checking
 * 
 * @param password 
 * @returns 
 */
const checkpointHandler = async (password: string) => {
  const storedPassword = await config.getConfig(ConfigKey);
  return storedPassword === password;
}

/**
 * route handler here
 * 
 * @param req 
 * @param res 
 */
const handler = async (req: EBGRequest, res: EBGResponse) => {
  const { password } = req.body;
  const success = await checkpointHandler(password);
  const domain = env.DOMAIN || '.localhost';

  let token = ''

  if (success) {
    // // Dump local cookie, for now.
    // res.cookie(CookieKey, true, { maxAge: CookieLife * 60 * 1000, httpOnly: false, domain });

    // // Also dump the cookie for the tag.
    token = maintenance.issueMaintenanceToken(CookieLife * 60);
    // res.cookie("ebgMaintenanceToken", token, { maxAge: CookieLife * 60 * 1000, httpOnly: false, domain });
  }

  return output(res, { success, domain, token });
}

export default async (server: Express, appModules) => {
  // Check first if mongodb is initialized!
  if (!appModules.hasOwnProperty('mongodb')) {
    return;
  }

  // Check first if checkpoint password is initialized!
  const isConfigInit = await config.isInitialized();
  if (!isConfigInit) {
    const randomized = generateRandomString(12);
    await config.setConfig(ConfigKey, randomized);
  }

  server.post('/utils/checkpoint', handler);
  return handler;
}