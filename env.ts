import _ from 'lodash'

export const env = process.env;
export const getEnv = () => env.ENV || "dev";

export const getEnvTag = () => {
  const env = getEnv();
  let tag = "";

  if (env === "") {
    tag = "dev";
  } else if (env === "prod" || env === "production") {
    tag = "";
  } else {
    tag = env;
  }

  return `${tag}`;
};

export const isDevEnv = () => getEnv() === "dev";
export const isTestEnv = () => getEnv() === "test";
export const isProductionEnv = () => {
  const _env = getEnv();
  return _env === "production" || _env === "prod";
};

export const isProdEnv = isProductionEnv; // just an alias

export const getEnvVariable = (variable: string, isANumber = false, defaultValue: number | string = '') => {
  const value = _.get(env, variable, defaultValue) as any;
  if (isANumber) {
    return isNaN(value) ? 0 : Number(value);
  }
  return value;
};

export const getEnvVar = getEnvVariable

export const allowedEnvironments = ['prod', 'production', 'test', 'dev'];
