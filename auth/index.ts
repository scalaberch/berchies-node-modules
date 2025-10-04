import { Request, Express } from "express";
import Controllers from "./controllers"
import middlewares from "./middlewares";
import { createRoute } from "../http/router"
import _ from 'lodash'
 
export const AuthControllers = Controllers;
export const Middlewares = middlewares;

export const getAuthBearerToken = (request: Request) => {
  const bearerString = (request.headers?.authorization || '').trim();
  if (bearerString.substring(0, 6).toLowerCase() !== 'bearer') {
    return '';
  }

  const bearerData = bearerString.split(' ');
  const bearer = (bearerData.length > 1) ? bearerData[1].trim() : '';
  return bearer;
}

export const getAuthTokenFromUrl = (request: Request) => {
  return _.get(request.query, "accessToken", "") as string;
}

export const checkIfHttpIsEnabled = () => {
}

export const loadHttpAdminAuth = (server: Express) => {
  const router = createRoute();
  router.get('/auth', (req, res) => { return false; });
  router.get('/auth/redirect', (req, res) => { return false; });
  return router;
}

export const loadHttpAuth = () => {
}

export const loadOAuthRoutes = () => {
  const router = createRoute();

  

  return router;
}

