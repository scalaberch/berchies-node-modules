import { Request, Response, NextFunction } from "express";
import expressSession, { Session } from "express-session";

export interface EBGNext extends NextFunction { }

export interface EBGRequest extends Request {
  removeIds?: Array<string | number>;
  pageQuery: EBGRequestPageQuery;
  jwt?: EBGJwtObject;
  getJWTData(): ImmutableJWTObject | CognitoJWTObject | null;
  getImmutableData(): any;
  getCognitoData(): EBGCognitoObject | null;
  getJWTString(): string;
  useragent?: any;

  getQuery(key?: string, fallbackValue?: any): any;
  getBody(key?: string, fallbackValue?: any): any;
  getParam(key?: string, fallbackValue?: any): any;

  getBodyFromKeys(keys: Array<string>, forcePrefillValue?: boolean): any;

  getModelPayloadFromBody(model: any, includePrimaryKey?: boolean): any;

  access?: Array<any>;
  session?: Session;
  rawBody?: any;
}

export interface EBGResponse extends Response {
  outputSuccess(payload: any, message?: string): void;
  outputCreated(payload: any, message?: string): void;
  outputJson(payload: any, code?: number);
  outputError(message: string, payload?: any, code?: number);
  outputAsCSV(dataset: any, fileName?: string);
  outputDiscordJson(payload: any, responseType?: number, visibleOnlyToUser?: boolean);
  redirectToUrl(url: string);
}

interface EBGJwtObject {
  cognitoData?: EBGCognitoObject;
}

interface EBGCognitoObject {
  cognitoId: string;
  cognitoUsername: string;
}

interface ImmutableJWTObject {
  email: string;
  client_name: string;
  org: string;
  environment_id: string;
  client_org: string;
  ether_key: string;
  stark_key: string;
  user_admin_key: string;
  imx_eth_address: string;
  imx_stark_address: string;
  imx_user_admin_address: string;
  zkevm_eth_address: string;
  zkevm_user_admin_address: string;
  iss: string;
  sub: string;
  aud: Array<string>;
  iat: Number;
  exp: Number;
  scope: string;
  azp: string;
}
interface CognitoJWTObject {
  sub: string;
  "cognito:groups": Array<string>;
  iss: string;
  version: Number;
  client_id: string;
  origin_jti: string;
  token_use: string;
  scope: string;
  auth_time: Number;
  exp: Number;
  iat: Number;
  jti: string;
  username: string;
  "cognito:username": string;
  email: string;
}

interface EBGRequestPageQuery {
  page?: number;
  perPage?: number;
  search?: string;
  searchObject?: object;
  sort?: string;
  sortBy?: string;
  sortObject?: object;
}

export interface EBGPaginationResponse {
  items: Array<any>;
  totalDocs: number;
  totalPages: number;
  limit: number;
  page: number;
  prevPage: number | null;
  hasPrevPage: boolean;
  nextPage: number | null;
  hasNextPage: boolean;
}

export type HttpModule = "checkpoint" | "oauth" | "session";