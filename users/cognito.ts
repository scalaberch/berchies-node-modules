import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  InitiateAuthCommand,
  AdminSetUserPasswordCommand,
  RespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider';

import { env } from '../env'
import { cognito } from '../constants'
import _ from 'lodash'

export const COGNITO_POOL_ID = _.get(env, 'AWS_COGNITO_POOL_ID', '') as string;
export const COGNITO_CLIENT_ID = _.get(env, 'AWS_COGNITO_CLIENT_ID', '') as string; 
export const ADMIN_COGNITO_POOL_ID = _.get(env, 'AWS_COGNITO_ADMIN_POOL_ID', '') as string;
export const ADMIN_COGNITO_CLIENT_ID = _.get(env, 'AWS_COGNITO_ADMIN_CLIENT_ID', '') as string; 

const client: any = new CognitoIdentityProviderClient({ region: process.env.AWS_DEFAULT_REGION });
const basePassword = '';

/**
 * 
 * @param UserPoolId 
 * @param Username 
 */
const checkIfUsernameExists = async (UserPoolId: string, Username: string) => {
  try {
    const command = new AdminGetUserCommand({ UserPoolId, Username });
    await client.send(command);
    return Promise.resolve(true);
  } catch (err) {
    return Promise.resolve(false);
  }
}

const getUser = async (UserPoolId: string, Username: string) => {
  const command = new AdminGetUserCommand({ UserPoolId, Username });
  const response = await client.send(command);
  const user = _.get(response, "UserAttributes", {});
  return { Attributes: user };
};

/**
 * 
 * @param UserPoolId 
 * @param Username 
 * @returns 
 */
const createUser = async (UserPoolId: string, Username: string, UserAttributes: Array<any>) => {
  try {
    const command = new AdminCreateUserCommand({ UserPoolId, Username, UserAttributes });
    const response = await client.send(command);
    const user = _.get(response, 'User', {});

    return Promise.resolve(user);
  } catch (err) {
    return Promise.resolve(null);
  }
}

/**
 * 
 * @param UserPoolId 
 * @param Username 
 * @returns 
 */
const markUserEmailAsVerified = async (UserPoolId: string, Username: string) => {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId,
      Username,
      UserAttributes: [
        { Name: 'email_verified', Value: 'true' }
      ]
    });
    await client.send(command);
    return Promise.resolve(true);
  } catch (err) {
    return Promise.resolve(false);
  }
}

/**
 * 
 * @param UserPoolId 
 * @param Username 
 * @param Password 
 * @returns 
 */
const forceSetUserPassword = async (UserPoolId: string, Username: string, Password: string) => {
  try {
    const command = new AdminSetUserPasswordCommand({
      UserPoolId,
      Username,
      Password
    });
    await client.send(command);
    return Promise.resolve(true);
  } catch (err) {
    return Promise.resolve(false);
  }
}

/**
 * 
 * @param ClientId 
 */
const authenticate = async (ClientId: string, secretHash: string, username: string, password?: string) => {
  const AuthFlow = 'USER_PASSWORD_AUTH'

  try {
    const command = new InitiateAuthCommand({
      AuthFlow,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId
    });
    const initiateAuthResponse = await client.send(command);
    let { ChallengeName, Session, AuthenticationResult } = initiateAuthResponse;

    if (ChallengeName) {
      // This also means this is a first time logging in.
      // For now this will just do it directly.
      AuthenticationResult = await respondToChallenge(ClientId, ChallengeName, Session, {
        USERNAME: username,
        NEW_PASSWORD: password
      });
    }

    const { AccessToken: jwt } = AuthenticationResult;
    return Promise.resolve(true);
  } catch (err) {
    console.log(err)
    return Promise.resolve(false);
  }
}

/**
 * 
 * @param ClientId 
 * @param ChallengeName 
 * @param Session 
 * @param ChallengeResponses 
 * @returns 
 */
const respondToChallenge = async (ClientId: string, ChallengeName: any, Session: string, ChallengeResponses: any) => {
  const respondToChallengeCommand = new RespondToAuthChallengeCommand({
    ClientId,
    ChallengeName, // Replace with obtained challenge
    ChallengeResponses,
    Session // Include session from InitiateAuth if applicable
  });

  try {
    const { AuthenticationResult } = await client.send(respondToChallengeCommand);
    return AuthenticationResult;
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * 
 * @param ClientId 
 * @param username 
 * @param password 
 * @returns 
 */
const issueJwtToken = async (ClientId: string, username: string, password?: string) => {
  const AuthFlow = 'USER_PASSWORD_AUTH'

  try {
    const command = new InitiateAuthCommand({
      AuthFlow,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId
    });

    const initiateAuthResponse = await client.send(command);
    let { ChallengeName, Session, AuthenticationResult } = initiateAuthResponse;

    if (ChallengeName) {
      // This also means this is a first time logging in.
      // For now this will just do it directly.
      AuthenticationResult = await respondToChallenge(ClientId, ChallengeName, Session, {
        USERNAME: username,
        NEW_PASSWORD: password
      });
    }

    return Promise.resolve({ tokens: AuthenticationResult, success: true });
  } catch (err) {
    console.error(err)
    return Promise.resolve({ success: false, error: err });
  }
}

/**
 * 
 * @param ClientId 
 * @param refreshToken 
 * @returns 
 */
const triggerRefreshToken = async (ClientId: string, refreshToken: string) => {

  try {

    const command = new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken, // Pass the refresh token
      },
      ClientId
    });

    const response = await client.send(command);
    let { AuthenticationResult } = response;

    return Promise.resolve({ tokens: AuthenticationResult, success: true });
  } catch (error) {
    console.error(error)
    return Promise.resolve({ success: false, error });
  }
}

/**
 * 
 * @param payloadUser 
 * @returns 
 */
const findSubIdAttributeFromCognitoUserPayload = (payloadUser: any) => {
  const attributes = _.get(payloadUser, 'Attributes', []);
  if (attributes.length === 0) {
    return '';
  }

  const filtered = attributes.filter(attr => attr.Name === 'sub');
  return filtered.length > 0 ? filtered[0].Value : '';
}

export default {
  checkIfUsernameExists,
  createUser,
  markUserEmailAsVerified,
  authenticate,
  forceSetUserPassword,
  issueJwtToken,
  triggerRefreshToken,
  findSubIdAttributeFromCognitoUserPayload,
  getUser,
};