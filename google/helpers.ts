import { Request, Response } from "express";
import Auth, { GenerateAuthUrlParams } from "./auth";
import { redirectToUrl } from "../http/handlers";

/**
 * generates a controller to do redirect login via google.
 *
 * @param params
 * @returns
 */
export const oauthRedirectUrlController = (params: GenerateAuthUrlParams) => {
  return (request: Request, response: Response) => {
    const redirectUrl = Auth.getOauthRedirectUrl(
      params.scope,
      params.access_type,
      params.prompt,
      params.state
    );
    return redirectToUrl(response, redirectUrl);
  };
};
