import _, { isNumber } from "lodash";
import { Express, Request, Response, NextFunction } from "express";
import { EBGRequest, EBGResponse } from "../interfaces";
import { output, outputSuccess, outputError, outputAsCsv, outputCreated } from "../handlers";
import {
  isFromCognito,
  getDataFromAccessTokenPayload,
} from "@modules/aws/cognito";
import { getAuthBearerToken } from "@modules/auth";
import { getModelAttributes } from "@modules/database/mysql";
import queryParams from "./queryparams";

import { outputAsJson } from "../../discord/http"

/**
 *
 * @param req
 * @param res
 * @param next
 */
const applyRequestFunctions = (
  req: EBGRequest,
  res: EBGResponse,
  next: NextFunction
) => {
  // Get basic jwt data
  req.getJWTData = () => _.get(req, "jwt", null);
  req.getJWTString = () => getAuthBearerToken(req);

  // Get cognito data from jwt
  req.getCognitoData = () => {
    const jwt = req.getJWTData();
    if (jwt === null) {
      return null;
    }
    return getDataFromAccessTokenPayload(jwt);
  };

  // Get fetchers
  req.getQuery = (key?: string, fallbackValue?: any) =>
    typeof key === "string" ? _.get(req.query, key, fallbackValue) : req.query;
  req.getParam = (key?: string, fallbackValue?: any) =>
    typeof key === "string" ? _.get(req.params, key, fallbackValue) : req.params;
  req.getBody = (key?: string, fallbackValue = null) =>
    typeof key === "string" ? _.get(req.body, key, fallbackValue) : req.body;

  // getModelPayloadFromBody
  req.getModelPayloadFromBody = getModelPayloadFromBody(req);

  req.getBodyFromKeys = (keys: Array<string>, forcePrefillValue = false) => {
    const params = {};
    if (keys.length === 0) {
      return params;
    }

    for (const key of keys) {
      params[key] = _.get(req.body, key, forcePrefillValue ? '' : null);
    }

    return params;
  }

  next();
};

/**
 *
 * @param req
 * @param res
 * @param next
 */
const applyResponseFunctions = (
  req: EBGRequest,
  res: EBGResponse,
  next: NextFunction
) => {
  res.outputSuccess = (payload: any, message?: string) => outputSuccess(res, message, payload, req.access);
  res.outputJson = (payload: any, code = 200) => output(res, payload, code);
  res.outputError = (message = "Error.", payload?: any, code = 200) => outputError(res, message, payload, code);
  res.outputAsCSV = (dataset: any, fileName?: string) => outputAsCsv(res, dataset, fileName);
  res.outputCreated = (payload: any, message?: string) => outputCreated(res, message, payload, req.access);
  res.outputDiscordJson = (payload: any, responseType?: number, visibleOnlyToUser?: boolean) => outputAsJson(res, payload, responseType, visibleOnlyToUser);

  next();
};

/**
 *
 * @param server
 */
const applyGlobalMiddleware = (server: Express) => {
  // Add up some extended functions.
  server.use(applyRequestFunctions);
  server.use(applyResponseFunctions);

  // Apply the query param middleware
  server.use(queryParams);
};

/**
 *
 */
const getModelPayloadFromBody = (
  request: EBGRequest,
  includePrimaryKey: boolean = false
) => {
  return (model: any) => {
    const attributes = getModelAttributes(model, includePrimaryKey);
    const payload = attributes.reduce((obj, attr) => {
      const value = request.getBody(attr);
      if (value !== null) {
        obj[attr] = value;
      }
      return obj;
    }, {});

    return payload;
  };
};

const appendHeaders = () => {

}

export default applyGlobalMiddleware;
