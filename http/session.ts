import { Express } from "express";
import expressSession from "express-session";
import hash from "object-hash";
import { env, isDevEnv, getEnvVariable } from "@modules/env";
import Cache from "../cache";
import RedisStore from "connect-redis";
import { EBGRequest, EBGResponse } from "./interfaces";
import _ from "lodash";
import { CookieLife } from "./checkpoint";

const isRedisEnabled = (appModules) => {
  return appModules.modules.indexOf("cache") >= 0;
};

export const sessionStatus = async (req: EBGRequest, res: EBGResponse) => {
  const session = req.session;
  const checkpointLoggedIn = session.checkpointLoggedIn;

  // session updated
  return res.outputSuccess({ session, checkpointLoggedIn }, "");
};

export default (server: Express, appModules?: any) => {
  const projectName = getEnvVariable("PROJ_NAME");
  const isDevMode = isDevEnv();
  const domain = env.DOMAIN || ".localhost";
  const secret = hash(projectName);
  const settings = {
    cookie: {
      secure: !isDevMode,
      maxAge: CookieLife * 60 * 1000,
      httpOnly: false,
      domain,
      sameSite: "none",
    },
    proxy: true,
    saveUninitialized: false,
    resave: false,
    secret,
    name: `${projectName}-cookie`,
  };

  // Check if redis exists and is being used!
  if (isRedisEnabled(appModules)) {
    const cache = appModules?.cache;
    const isActive = Cache.isCacheActive();
    if (isActive) {
      let redisStore = new RedisStore({
        client: cache,
        prefix: "ebg-session:",
      });

      settings["store"] = redisStore;
    }
  }

  // Use it!
  server.use(expressSession(settings));
};
