import express, { Express, application, Router, Request } from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import multer from "multer";
import applyCors from "./cors";

import useragent from "express-useragent";
import { rateLimit } from "express-rate-limit";

import { notFoundHandler, httpRequestLog, tooManyRequestsHandler } from "./handlers";
import { loadRoutes, defaultRoute } from "./router";
import Middleware from "./middlewares";
import Checkpoint from "./checkpoint";
import Session from "./session";
import Websockets from "../websockets";
import overrideSNSHeader from "./middlewares/overrideSNSHeader";

const _globalRouteRpm = 240;
const _healthCheckRpm = 5;
export const port: number = parseInt(process.env.PORT || "") || 3000;

let isWebsocketsEnabled = false;

/**
 * Creates an Express server
 *
 * @returns {Express}
 */
const create = (config: any, appModules?: any) => {
  const server: Express = express();
  const upload = multer();
  const httpModules = config.httpModules || [];

  // Override SNS headers
  // This is used for some services to be allowed to access data.
  server.use(overrideSNSHeader);

  // Basic server setup.
  server.use(helmet() as express.RequestHandler);
  server.use(bodyParser.urlencoded({ extended: true }));
  server.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf; // save raw buffer for signature check
      },
    })
  );

  // server.use(upload.any()); // disable upload.any() globally since it might give performance overhead and security reasons (as it allows parsing files for all routes)
  server.use(useragent.express());

  // Apply the middlewares
  Middleware(server);

  // apply cors config
  applyCors(server, config);

  // setup rate limiter
  setRateLimit(server);

  // apply logging
  server.use(httpRequestLog);
  server.set("trust proxy", true);

  // setup session handling.
  if (httpModules.indexOf("session") >= 0) {
    // await Checkpoint(server);
    Session(server, appModules);
  }

  // setup websockets
  if (httpModules.indexOf("websockets") >= 0) {
    isWebsocketsEnabled = true;
  }

  // setup public folder

  // setup routing
  routes(server, httpModules, appModules);

  // Return instance of express.
  return server;
};

/**
 * Starts the server application.
 *
 * @param application
 */
const start = (server: Express) => {
  return new Promise((resolve, reject) => {
    const _server = server.listen(port, async () => {
      let websockets = null;

      if (isWebsocketsEnabled) {
        _server['ws'] = await Websockets.init(_server);
      }

      resolve(_server);
    });
  });
};

/**
 * Set a global rate limit to the service.
 *
 * @param server
 */
const setRateLimit = async (server: Express) => {
  const config = setRouteRateLimit(_globalRouteRpm);
  server.use(config);
};

/**
 * sets a route's rate limit (requests per minute)
 *
 * @param reqsPerMinute
 * @returns
 */
export const setRouteRateLimit = (reqsPerMinute: number) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooManyRequestsHandler,
    max: reqsPerMinute, // 60 requests per minute
    windowMs: 60 * 1000, // 1 minute.
    validate: {
      trustProxy: false,
    },
  });
};

/**
 * defines and initializes the http routes
 *
 * @param server
 */
const routes = async (server: Express, loadedModules: Array<any>, appModules) => {
  // Add up the health-checker route
  server.get("/ebg-health-check", setRouteRateLimit(_healthCheckRpm), defaultRoute);

  // add system routes.
  if (loadedModules.indexOf("checkpoint") >= 0) {
    await Checkpoint(server, appModules);
  }

  // iterate to all routes found.
  const hasIndex = await loadRoutes(server);
  if (hasIndex < 2) {
    server.get("/", defaultRoute);
  }

  // Last, add up the not found handler.
  server.use(notFoundHandler);
};

/**
 * get a request's ip address.
 *
 * @param req
 */
export const getRequestIPAddress = (req: Request) => {
  let ips =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    "";

  return ips;
};

export default {
  create,
  start,
  routes,
};
