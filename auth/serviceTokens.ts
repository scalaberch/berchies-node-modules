import _ from "lodash";
import { env } from "@modules/env";
import {  Request, Response, NextFunction } from "express";
import { getAuthBearerToken } from "./index"
import { notAuthHandler } from "../http/handlers";

export let serviceUsers = Object.create(null);

const init = () => {
  const keys = Object.keys(env).filter((key) => key.match(/^SVC_USER/));
  serviceUsers = keys.reduce((users, key) => {
    const value = _.get(env, key, "") as string;
    const token = value.trim();
    if (token.length === 0) {
      return users;
    }

    const [spacer, user] = key.split("SVC_USER_");
    return { ...users, [token]: { user, key } };
  }, {});
};


export const middleware = (req: Request, res: Response, next: NextFunction)  => {
  const token = getAuthBearerToken(req);
  if (!serviceUsers.hasOwnProperty(token)) {
    return notAuthHandler(req, res, 'Access not allowed. Service token required.')
  }

  next();
};

export default {
  init,
  middleware,
};
