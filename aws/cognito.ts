import _ from "lodash";
import { env } from "@modules/env"
import { verify, jwkSources } from "../auth/jwt"
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider"; 
import { CognitoJwtVerifier } from "aws-jwt-verify";

export const isFromCognito = (payload: any, sourceJwk: string) => {
  const iss = _.get(payload, "iss", "");
  const isFromCognito = sourceJwk.replace("/.well-known/jwks.json", "") === iss;
  return isFromCognito;
};

const getLoginMethodFromUsername = (username: any) => {
  const items = username.split("_");
  const method = items.length < 2 ? "" : items[0];

  switch (method.toLowerCase()) {
    case "google":
      return "google";
    case "signinwithapple":
      return "apple";
    default:
      return "";
  }
};

export const fetchCognitoDataFromPayload = (payload: any) => {
  // const userId = _.get(payload, "sub", "")
  // const username = _.get(payload, "cognito:username", "");
  // const loginMethod = payload.identities.length > 0 ? payload.identities[0].providerName.toLowerCase() : "manual";
  // const email = _.get(payload, 'email', "");

  const data = {
    // userId,
    // username,
    // loginMethod,
    // email,
  };

  return data;
};

/**
 * this is where you get data from 
 * 
 * @param accessTokenPayload 
 */
export const getDataFromAccessTokenPayload = (accessTokenPayload: any) => {
  const cognitoId = _.get(accessTokenPayload, "sub", "")
  const cognitoUsername = _.get(accessTokenPayload, "username", "");
  return {cognitoId, cognitoUsername}
}

/**
 * gets data from aws cognito id token
 * 
 * @param idToken 
 * @returns 
 */
export const fetchDataFromIDToken = async (idToken: any) => {
  try {
    const data = await verify(idToken, jwkSources.COGNITO);

    // Get all data
    const name = _.get(data, "name", "")
    const email = _.get(data, "email", "")
    const identities = _.get(data, "identities", [])
    const cognitoId = _.get(data, "sub", "")
    const cognitoUsername = _.get(data, "cognito:username", "")
    const loginMethod = identities.length > 0 ? (identities[0].providerName.toLowerCase()) : "manual";
    const loginMethodId = identities.length > 0 ? (identities[0].userId) : "";
    const picture = _.get(data, "picture", "")

    return {
      name,
      email,
      cognitoId,
      cognitoUsername,
      loginMethod,
      loginMethodId,
      picture,
    }
  } catch(error) {
    return null;
  }

};

export const getCognitoUser = async (username: string) => {
  const client = new CognitoIdentityProviderClient({
    region: env.AWS_DEFAULT_REGION || 'eu-central-1'
  });

  const input = { // AdminGetUserRequest
    UserPoolId: env.AWS_COGNITO_POOL_ID || '',
    Username: username, // required
  };

  const command = new AdminGetUserCommand(input);
  const response = await client.send(command);
  const attributes = _.chain(response.UserAttributes).keyBy('Name').mapValues('Value').value();

  const output = {
    enabled: response.Enabled,
    username: response.Username,
    created_date: response.UserCreateDate,
    modified_date: response.UserLastModifiedDate,
    ...attributes
  }

  return output;
}

export const verifyJwt = async (userPoolIdKey: string, clientIdKey: string, token: string) => {
  const userPoolId = _.get(env, userPoolIdKey, '');
  const clientId = _.get(env, clientIdKey, '');

  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: "access",
  });

  return verifier.verify(token);
}

export default {};
