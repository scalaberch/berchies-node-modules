import _ from "lodash";
import cache from "@modules/cache";
import { getEnvVariable as getEnv } from "../../env";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getAuthBearerToken, getAuthTokenFromUrl } from "../index";

// some required variables
const algorithm = "HS256";
const invalidAccessTokenPrefix = "invalidAccessTokens";
const invalidRefreshTokenPrefix = "invalidRefreshTokens";

// tokens and expiry configuration
export const ACCESS_SECRET: string = getEnv("JWT_ACCESS_SECRET", false, "");
export const REFRESH_SECRET: string = getEnv("JWT_REFRESH_SECRET", false, "");
export const ACCESS_EXPIRY: number = getEnv("ACCESS_TOKEN_EXPIRY", true, 1800);
export const REFRESH_EXPIRY: number = getEnv("REFRESH_TOKEN_EXPIRY", true, 2592000);

// re-export stuff
export { TokenExpiredError };

interface BaseJWTPayload {
  sub: string | number; // Subject (user ID)
  iat: number; // Issued At (timestamp)
  exp: number; // Expiration time
  nbf: number; // Not Before
  iss: string; // Issuer - normally the url of the server
  aud: string; // Audience - who's intended for. could be random string or a url
  sid?: string; // session id
}

enum JWTKind {
  access,
  refresh,
}

/**
 * express middleware to parse jwt refresh tokens during route calls.
 * most likely being used on token refresh action
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const preflightRefreshToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = getAuthBearerToken(req);
  if (refreshToken === "") {
    return res
      .status(401)
      .json({ message: "Token is required.", error: "missing_token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    _.set(req, "refreshTokenData", decoded);
    _.set(req, "refreshToken", refreshToken);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: error.message, error: "jwt_decode_error" });
  }
};

/**
 * express middleware to parse jwt access tokens during route calls
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const preflightAccessToken = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = getAuthBearerToken(req);
  if (accessToken === "") {
    return res
      .status(401)
      .json({ message: "Token is required.", error: "missing_token" });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_SECRET);
    _.set(req, "accessTokenData", decoded);
    _.set(req, "accessToken", accessToken);
    next();
  } catch (error) {
    let errorType = "jwt_decode_error";
    let message = error.message;

    if (error instanceof TokenExpiredError) {
      errorType = "token_expired";
      message = "Token has already expired.";
    }

    // console.error(error);
    return res.status(401).json({ message, error: errorType });
  }
};

/**
 * generates a jwt access token
 *
 * @param sub - the user id
 * @param payload - extra payload data. force it to be {} if nothing
 * @param issuer - issuer url
 * @param audience - target audience
 * @returns
 */
export const generateAccessToken = (
  sub: string | number,
  payload = {},
  issuer = "http://localhost",
  audience = ""
) => {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      jti,
      sub,
      iss: issuer,
      aud: audience,
      ...payload,
    },
    ACCESS_SECRET,
    {
      algorithm,
      expiresIn: ACCESS_EXPIRY,
      notBefore: "0s",
    }
  );

  return { jti, token };
};

/**
 * generates a jwt refresh token
 *
 * @param sub - the user id
 * @param payload - extra payload data. force it to be {} if nothing
 * @param issuer - issuer url
 * @param audience - target audience
 * @returns
 */
export const generateRefreshToken = (
  sub: string | number,
  payload = {},
  issuer = "http://api.localhost",
  audience = ""
) => {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      jti,
      sub,
      iss: issuer,
      aud: audience,
      ...payload,
    },
    REFRESH_SECRET,
    {
      algorithm,
      expiresIn: REFRESH_EXPIRY,
      notBefore: "0s",
    }
  );

  return { jti, token };
};

/**
 * checks if a given jwt is inside the invalid list in cache.
 * if cache is not enabled, then automatically it's assumed valid.
 * 
 * @param token 
 * @param tokenType 
 * @returns 
 */
const isTokenInvalid = async (token: string, tokenType: JWTKind) => {
  if (!cache.isCacheActive()) {
    // Cache is inactive — assume token is valid
    return false;
  }

  const prefix =
    tokenType === JWTKind.refresh ? invalidRefreshTokenPrefix : invalidAccessTokenPrefix;
  return await cache.keyExists(`${prefix}:${token}`);
};

/**
 * checks if access token is in the invalidated list.
 * 
 * @param accessToken 
 * @returns 
 */
const isAccessTokenInvalid = (accessToken: string) => isTokenInvalid(accessToken, JWTKind.access);

/**
 * checks if refresh token is in the invalidated list.
 * 
 * @param refreshToken 
 * @returns 
 */
const isRefreshTokenInvalid = async (refreshToken: string) => isTokenInvalid(refreshToken, JWTKind.refresh);



const makeTokenInvalid = async (token: string, tokenType: JWTKind) => {
  if (!cache.isCacheActive()) {
    return false;
  }

  // decode it
  try {
    const secret = tokenType === JWTKind.access ? ACCESS_SECRET : REFRESH_SECRET
    const decoded = jwt.verify(token, secret);
    console.log(decoded)
  } catch (error) {

  }
}



const makeAccessTokenInvalid = (accessToken: string) => makeTokenInvalid(accessToken, JWTKind.access);

const makeRefreshTokenInvalid = (refreshToken: string) => makeTokenInvalid(refreshToken, JWTKind.access);

