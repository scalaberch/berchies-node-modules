import _ from "lodash";
import { env, getEnvVariable as getEnv } from "../../env";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getAuthBearerToken, getAuthTokenFromUrl } from "../index";

// some required algorithms
const algorithm = "HS256";

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

/**
 * express middleware for authenticating jwt's
 *
 * @todo: refactor this
 * @param req
 * @param res
 * @param next
 * @returns
 */
const authenticateAccessToken = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers["authorization"];
  if (!auth) {
    return res.status(401).json({ error: "Missing access token" });
  }

  // Split on space once: "Bearer <token>"
  const parts = auth.split(" ");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "Malformed authorization header" });
  }

  const [scheme, token] = parts;

  if (!/^bearer$/i.test(scheme)) {
    // ^bearer$ with /i flag = matches any case variant
    return res.status(401).json({ error: "Invalid authorization scheme" });
  }

  jwt.verify(token, ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }
    // @todo: attach decoded jwt
    // req.user = decoded; // attach user info

    next();
  });
};

/**
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
    // console.error(error);

    if (error instanceof TokenExpiredError) {
      errorType = "token_expired";
      message = "Token has already expired.";
    }

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
