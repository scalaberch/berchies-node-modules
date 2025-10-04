import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { getRequestIPAddress } from "./index"
import Log from "../logs"
import { camelCaseToSentence, getCurrentTimestamp } from "../helpers";
import { createObjectCsvStringifier as createCsv } from "csv-writer";

interface Error {
  statusCode?: number;
  errors?: Object;
  message?: string;
}

interface APIJSONOutput {
  error?: Object;
  message: String;
  success: Boolean;
  data: any;
}

export interface CustomRequest<T> extends Request {
  body: T
}

/**
 * 
 * @param res 
 * @param payload 
 * @param code 
 * @returns 
 */
export const output = (res: Response, payload: any, code: number = 200) => {
  // Add headers here?
  // eslint-disable-next-line no-use-before-define
  // res.header('Access-Control-Allow-Credentials', true);

  // res.header("Access-Control-Allow-Headers", "*");
  // res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');

  return res.status(code).json(payload)
}

/**
 * 
 * @param res 
 * @param message 
 * @param payload
 * @param access
 */
export const outputSuccess = (
  res: Response,
  message: string,
  payload?: any,
  access?: Array<any>
) => {
  return output(res, {
    success: true,
    message,
    data: payload,
    access: access,
  });
};

/**
 * 
 * @param res 
 * @param message 
 * @param payload
 * @param access
 */
export const outputCreated = (
  res: Response,
  message: string,
  payload?: any,
  access?: Array<any>
) => {
  return output(res, {
    success: true,
    message,
    data: payload,
    access: access,
  }, 201);
};

/**
 * 
 * @param res 
 * @param message 
 * @param payload 
 * @param code
 * @returns 
 */
export const outputError = (res: Response, message: string, payload?: any, code = 200) => {
  return output(res, {
    success: false,
    message,
    error: payload
  }, code);
}

/**
 * 
 * @param res 
 * @param url 
 */
export const redirectToUrl = (res: Response, url: string, customMessage: string = '') => {
  return res.status(301).redirect(url);
}

/**
 * 
 * @param targetUrl 
 * @returns 
 */
export const generateRouteRedirectToUrl = (targetUrl = 'https://www.eyeball.games') => {
  return (req: Request, res: Response) => {
    return redirectToUrl(res, targetUrl);
    // return res.status(301)
  }
}

/**
 * error handler [5xx]
 * 
 * @param err 
 * @param req 
 * @param res 
 * @param next 
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = err.statusCode || 500; // Set default status code to 500 (Internal Server Error)
  const message = err.message || "Something went wrong."; // Set default message
  const errors: Array<{ field: string; message: string }> = []; // Empty array for collecting errors

  // Send error response
  res.status(status).json({
    message,
    errors,
  });

  // If next is called, pass the error to the next error handler
  next(err);
}

/**
 * route not found handler [404]
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => {
  res.status(404).json({
    message: `Route '${req.path}' not found.`
  })
}

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export const tooManyRequestsHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: any
) => {
  res.status(options.statusCode).json({
    message: `Too many requests! Please try again in a few moments.`
  })
}

/**
 * handler for non-authorized requests [401]
 * this means requests dont have authorization or not logged in
 * 
 * @param req 
 * @param res 
 */
export const notAuthHandler = (req: Request, res: Response, customMsg: string = '') => output(res, {
  'message': customMsg === '' ? `Access to '${req.path}' requires authorization.` : customMsg,
  'error': 'unauthorized'
}, 401)

/**
 * handler for not-allowed requests [403]
 * user *might* be logged in, but user doesn't have access required to the resource 
 * (most likely resource has elevated privileges like admin, etc)
 * 
 * @param req 
 * @param res 
 */
export const notAllowedHandler = (req: Request, res: Response, customMsg: string = '') => output(res, {
  'message': customMsg === '' ? `Access to '${req.path}' is not allowed.` : customMsg,
  'error': 'forbidden'
}, 403)

/**
 * middleware for auto http requests logging :)
 * 
 * @param req 
 * @param res 
 * @param next 
 */
export const httpRequestLog = async (req: Request, res: Response, next: NextFunction) => {
  const { originalUrl, method, headers } = req;
  const ipAddress = getRequestIPAddress(req);
  const userAgent: string = headers['user-agent'];

  if (userAgent === 'ELB-HealthChecker/2.0') {
    return next();
  }

  // console.log("requesting...")
  const body = method === "POST" || method === "PUT" ? req.body : {};

  Log.http(`${method} ${originalUrl}`, {
    ipAddress, userAgent, headers, body
  });

  next();
}

/**
 * output as a csv report
 * 
 * @param res 
 * @param dataset 
 * @param outputName 
 */
export const outputAsCsv = async (res: Response, dataset: Array<any>, outputName = '') => {
  // Auto generate the header
  const firstItem = dataset.length > 0 ? dataset[0] : {};
  const header = Object.keys(firstItem).map((key) => ({
    id: key, title: camelCaseToSentence(key),
  }));

  // Create csv dataset.
  const csvStringifier = createCsv({ header });
  const csvHeader = csvStringifier.getHeaderString();
  const csvRows = csvStringifier.stringifyRecords(dataset);
  const csvContent = csvHeader + csvRows;

  // Output the csv file.
  const fileName = outputName.length > 0 ? outputName : getCurrentTimestamp();
  res.header("Content-Type", "text/csv");
  res.header("Content-Disposition", `attachment; filename=${fileName}.csv`);
  return res.send(csvContent);
}

export default {};