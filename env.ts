import _ from "lodash";

export enum Environment {
  dev = "dev",
  test = "test",
  staging = "staging",
  prod = "prod",
  production = "production", // alias of prod
}

type Production = Environment.prod | Environment.production;

/**
 * get all the environment variables
 *
 */
export const env = process.env;

/**
 * some helper variable
 *
 */
export const allowedEnvironments = Object.values(Environment) as string[];

/**
 * Checks if a given string is one of the valid values in the Environment enum.
 * This is a Type Predicate, which tells TypeScript the value's type is narrowed
 * to 'Environment' if the function returns true.
 *
 * @param value
 * @returns
 */
export const isValidEnvironment = (value: string | undefined): value is Environment =>
  allowedEnvironments.includes(value as string);

/**
 * gets the current ENV value
 *
 * @returns
 */
export const getEnv = (): Environment => {
  const defaultValue = Environment.dev;
  const envValue: string = (env.ENV || defaultValue).toLowerCase();

  if (isValidEnvironment(envValue)) {
    return envValue;
  }

  return defaultValue;
};

/**
 * helper function to get the "tag" of a certain project environemtn
 * 
 * @returns 
 */
export const getEnvTag = () => {
  const env = getEnv();
  if (env === Environment.prod || env === Environment.production) {
    return ""
  }
  return env;
};

/**
 * gets an environment variable from process.env
 * 
 * @param variable 
 * @param isANumber 
 * @param defaultValue 
 * @returns 
 */
export const getEnvVariable = (
  variable: string,
  isANumber = false,
  defaultValue: number | string = ""
) => {
  const value = _.get(env, variable, defaultValue) as any;
  if (isANumber) {
    return isNaN(value) ? 0 : Number(value);
  }
  return value;
};

export const isDevEnv = () => getEnv() === Environment.dev;
export const isTestEnv = () => getEnv() === Environment.test;
export const isProductionEnv = () => {
  const _env = getEnv();
  return _env === "production" || _env === "prod";
};

export const isProdEnv = isProductionEnv; // just an alias



export const getEnvVar = getEnvVariable;
