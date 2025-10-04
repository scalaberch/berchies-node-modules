import express, { Express, Router, Response, Request, NextFunction } from "express"
import fs from "fs"
import { fetchAllFiles } from "../helpers"
import { output, notFoundHandler } from "./handlers"

const routesPath = "./src/routes/"
const router = express.Router();
export default router;

export const createRoute = () => express.Router();

/**
 * defines the default route.
 * 
 * @param req 
 * @param res 
 */
export const defaultRoute = (req: Request, res: Response) => {
  return output(res, { });
}

/**
 * loads the routes found in src/routes
 * 
 * @param server 
 */
export const loadRoutes = async (server: Express) => {
  const routesPath = './src/routes';
  const files: Array<string> = fetchAllFiles(routesPath, [], ['README.md', '.DS_Store']);

  if (files.length === 0) {
    return 0;
  }

  const allowedExts = ['ts', 'js']
  let hasIndex = false;

  for (const routeFile of files) {
    const relativeFilePath = routeFile.replace(routesPath, '');
    const relativeFile = relativeFilePath.split(".");
    if (relativeFile.length < 2) {
      continue;
    }

    const ext = relativeFile.at(-1).toLowerCase();
    if (allowedExts.indexOf(ext) < 0) {
      continue;
    }

    const path = `${process.cwd()}/src/routes${relativeFilePath}`
    const routeModule = await import(path);
    if (!isValidRouteModule(routeModule)) {
      continue;
    }

    // Load it to the server.
    const routeFileName = routeFile.split('/').pop()?.split('.')[0] || '';
    const hasIndexPath = (routeFileName.toLowerCase() === 'index')
    const routePath = (hasIndexPath) ? relativeFile[0].replace('index', '') : relativeFile[0]
    server.use(routePath, routeModule.default);
  }

  return hasIndex ? 2 : 1;
}

/**
 * condition check if a module is a valid route/controller module
 * 
 * @param importedModule 
 * @returns 
 */
export const isValidRouteModule = (importedModule: any) => {
  return Object.getPrototypeOf(importedModule.default) === Router
}

/**
 * middleware to further filter routing from specific domains
 * 
 * @param domains 
 * @returns 
 */
export const accessRouteFromTheseDomains = (domains: Array<string>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const host = req.get('host');
    if (!domains.includes(host)) {
      return notFoundHandler(req, res, next);
    }
    return next();
  }
}

export const createGroupRoute = (router: express.Router, prefix = '/', assigner: Function, middlewares = []) => {
  let subroutes = createRoute();
  if (middlewares.length > 0) {
    subroutes.use(middlewares);
  }
  
  if (typeof assigner === 'function') {
    subroutes = assigner(subroutes);
  }

  router.use(prefix, subroutes);
  return router;
}