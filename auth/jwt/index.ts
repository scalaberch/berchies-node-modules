import _ from "lodash";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { getAuthBearerToken, getAuthTokenFromUrl } from "../index";
import { notAuthHandler } from "../../http/handlers";
import { env, getEnvVariable } from "../../env";
import {
  output,
  outputSuccess,
  outputError,
  notFoundHandler,
} from "../../http/handlers";

import { cognitoLoginMethods } from "../constants";
import {
  isFromCognito,
  fetchCognitoDataFromPayload,
  verifyJwt,
} from "@modules/aws/cognito";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { JwtExpiredError } from "aws-jwt-verify/error";
import crypto from "crypto";

const awsRegion: string = env.AWS_DEFAULT_REGION || "eu-central-1";
const cognitoPoolId: string = env.AWS_COGNITO_POOL_ID || "";

export const jwkSources = {
  IMMUTABLE: "https://auth.immutable.com/.well-known/jwks.json",
  COGNITO: `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoPoolId}/.well-known/jwks.json`,
};

/**
 * HTTP server middleware to be called.
 *
 * @deprecated
 * @param request
 * @param response
 * @param next
 */
export const middleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract JWT from header and return 401 on failure
    // 2. Decode JWT and return 403 on failure
    // 3. If auth is enabled, then verify JWT and return 403 on failure
    // 4. Make decoded JWT payload accessible to controllers
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * verify jwt token with given source uri jwk
 *
 * @param token
 * @returns
 */
export const verify = async (token: string, jwksUri?: string) => {
  let payload: JwtPayload | string = {};
  const jwkClient: JwksClient = new JwksClient({ jwksUri });

  try {
    // Decode the token header to get the kid (key ID)
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header.kid;

    // Retrieve the signing key from the JWKS using the kid
    const signingKey = await jwkClient.getSigningKey(kid);
    const pubKey = signingKey.getPublicKey();

    // Verify the token using the retrieved key
    payload = await jwt.verify(token, pubKey, { algorithms: ["RS256"] }); // Adjust algorithms as needed
  } catch (error) {
    switch (error.name) {
      case "TokenExpiredError":
        error.message = "Token has already expired.";
        break;
      case "NotBeforeError":
        error.message = "Token is not yet active.";
        break;
    }

    throw error;
  }

  return payload;
};

/**
 * handle authentication based on immutable issued JWK
 *
 * @param request
 * @param response
 * @param next
 */
const immutable = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  // 1. Extract JWT from header and return 401 on failure
  const token = getAuthBearerToken(request);
  if (token === "") {
    return notAuthHandler(
      request,
      response,
      "Immutable JWT required on authorization."
    );
  }

  // 2. Verify JWT if valid and from immutable.
  try {
    const data = await verify(token, jwkSources.IMMUTABLE);

    // 2.1. Check if it came from immutable
    // @todo

    // 3. Make decoded JWT payload accessible to controllers
    const loginData =
      typeof data === "string" ? ["", ""] : data?.sub.split("|");
    const login = { method: loginData[0], id: loginData[1] };
    request["jwt"] = data; // { data, token, login };

    // Proceed to next.
    next();
  } catch (error) {
    return notAuthHandler(request, response, error.message);
  }
};

/**
 * handle authentication based on AWS cognito issued JWK
 * @todo: use this! https://github.com/awslabs/aws-jwt-verify
 *
 * @deprecated
 * @param request
 * @param response
 * @param next
 */
const cognitoLegacy = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  // 1. Extract JWT from header and return 401 on failure
  const token = getAuthBearerToken(request);
  if (token === "") {
    return notAuthHandler(
      request,
      response,
      "Cognito JWT required on authorization."
    );
  }

  // 2. Verify JWT if valid and from immutable.
  try {
    const data = await verify(token, jwkSources.COGNITO);

    // 2.1. Check if it came from cognito
    const fromCognito = isFromCognito(data, jwkSources.COGNITO);
    if (!fromCognito) {
      return notAuthHandler(
        request,
        response,
        "Mismatched token source! Please check your token source and your JWT configuration and try again."
      );
    }

    // 3. Make decoded JWT payload accessible to controllers
    // const cognitoData = fetchCognitoDataFromPayload(data);
    request["jwt"] = data;
    // console.log(data);
    // { data, token, cognitoData };

    // Proceed to next.
    next();
  } catch (error) {
    return notAuthHandler(request, response, error.message);
  }
};

/**
 * this can be used to output a jwt's data. use this only for debugging/dev purposes!
 *
 * @param req
 * @param res
 */
const verifyJWTRouteControl = async (req: Request, res: Response) => {
  const jwt = _.get(req, "jwt", {});
  return outputSuccess(res, "", [jwt]);
};

/**
 * express middleware in handling cognito jwt's which are sourced from ADMIN POOL
 *
 * @param request
 * @param response
 * @param next
 * @returns
 */
const admin = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const token = getAuthBearerToken(request);
  if (token === "") {
    return notAuthHandler(
      request,
      response,
      "Cognito JWT required on authorization. JWT must be privileged."
    );
  }

  try {
    const payload = await verifyJwt(
      "AWS_COGNITO_ADMIN_POOL_ID",
      "AWS_COGNITO_ADMIN_CLIENT_ID",
      token
    );

    request["jwt"] = payload;
    next();
  } catch (error) {
    console.log(error);

    if (error instanceof JwtExpiredError) {
      return notAuthHandler(
        request,
        response,
        "Your auth token has already expired!"
      );
    }
    return notAuthHandler(request, response, "JWT is invalid or malformed!");
  }
};

/**
 * express middleware in handling cognito jwt's which are sourced from MAIN POOL
 *
 * @param request
 * @param response
 * @param next
 * @returns
 */
const cognito = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const token = getAuthBearerToken(request);
  if (token === "") {
    return notAuthHandler(
      request,
      response,
      "Cognito JWT required on authorization."
    );
  }

  try {
    const payload = await verifyJwt(
      "AWS_COGNITO_POOL_ID",
      "AWS_COGNITO_CLIENT_ID",
      token
    );
    request["jwt"] = payload;
    next();
  } catch (error) {
    // console.log(error);

    if (error instanceof JwtExpiredError) {
      return notAuthHandler(
        request,
        response,
        "Your auth token has already expired!"
      );
    }
    return notAuthHandler(request, response, "JWT is invalid or malformed!");
  }
};

/**
 * generates an express middleware in handling cognito jwt's which are sourced from MAIN POOL.
 * this creates the middleware function, so be wary on the usage.
 *
 * @param strict
 */
const cognitoOptional = (strict = false) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    const token = getAuthBearerToken(request);
    if (strict && token === "") {
      return notAuthHandler(
        request,
        response,
        "Cognito JWT required on authorization."
      );
    }

    try {
      const payload = await verifyJwt(
        "AWS_COGNITO_POOL_ID",
        "AWS_COGNITO_CLIENT_ID",
        token
      );
      request["jwt"] = payload;
    } catch (error) {
      if (strict) {
        if (error instanceof JwtExpiredError) {
          return notAuthHandler(
            request,
            response,
            "Your auth token has already expired!"
          );
        }
        return notAuthHandler(
          request,
          response,
          "JWT is invalid or malformed!"
        );
      }
    }
    next();
  };
};

/**
 * express middleware in handling cognito jwt's which are sourced from ADMIN POOL
 *
 * @param request
 * @param response
 * @param next
 * @returns
 */
const adminUrlParam = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const token = getAuthTokenFromUrl(request);
  if (token === "") {
    return notAuthHandler(
      request,
      response,
      "Cognito JWT required on authorization. JWT must be privileged."
    );
  }

  try {
    const payload = await verifyJwt(
      "AWS_COGNITO_ADMIN_POOL_ID",
      "AWS_COGNITO_ADMIN_CLIENT_ID",
      token
    );

    request["jwt"] = payload;
    next();
  } catch (error) {
    if (error instanceof JwtExpiredError) {
      return notAuthHandler(
        request,
        response,
        "Your auth token has already expired!"
      );
    }
    return notAuthHandler(request, response, "JWT is invalid or malformed!");
  }
};

/**
 * checks if a cognito access token is expired. used only for special occassions.
 *
 * @param accessToken
 * @returns
 */
const isCognitoAccessTokenExpired = async (accessToken: string) => {
  try {
    await verifyJwt(
      "AWS_COGNITO_POOL_ID",
      "AWS_COGNITO_CLIENT_ID",
      accessToken
    );
  } catch (error) {
    if (error instanceof JwtExpiredError) {
      return true;
    }
  }

  return false;
};


export default {
  immutable,
  cognito,
  admin,
  verifyJWTRouteControl,
  adminUrlParam,
  isCognitoAccessTokenExpired,
  cognitoOptional,
};
