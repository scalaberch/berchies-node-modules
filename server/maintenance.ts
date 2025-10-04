import { EBGRequest, EBGResponse, EBGNext } from "../http/interfaces";
import { output } from "@modules/http/handlers";
import { isMongoEnabled } from "../database/mongo/index";
import Config, { ConfigModel } from "../nodeconfig";
import moment from "moment-timezone";
import _ from "lodash";
import { timezone } from "@modules/server/index";
import { timestampFormat } from "@modules/constants";
import { v4 as uuidv4 } from 'uuid';
import Cache from "../cache"

const MAINTENANCE_CODE = 523;
const MAINTENANCE_HEADER_KEY = 'ebg-maintenance-token';

/**
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const checkpoint = async (
  req: EBGRequest,
  res: EBGResponse,
  next: EBGNext
) => {
  const onMaintenance = await isOnMaintenanceMode(null);
  if (onMaintenance) {

    // Check header if there's a maintenance token.
    const maintenanceHeader = req.header(MAINTENANCE_HEADER_KEY) as string;
    const hasTokenExists = await tokenExists(maintenanceHeader)
    if (hasTokenExists) {
      return next();
    }

    return output(
      res,
      {
        message: "Service is under maintenance.",
        hasTokenExists
      },
      MAINTENANCE_CODE
    );
  }

  return next();
};

/**
 *
 * @param sourceConfig
 * @returns
 */
const isOnMaintenanceMode = async (sourceConfig = null) => {
  // If mongo db is not enabled, then just return as false.
  const hasMongoEnabled = isMongoEnabled();
  if (!hasMongoEnabled) {
    return false;
  }

  // Check configuration if the variable is turned on.
  if (sourceConfig === null) {
    sourceConfig = await getMaintenanceWindow();
  }

  const { maintenanceStartDate, maintenanceEndDate } = sourceConfig;
  const now = moment.tz(new Date(), timezone);
  const startDate = moment.tz(new Date(maintenanceStartDate), timezone);
  const endDate = moment.tz(new Date(maintenanceEndDate), timezone);
  const onMaintenance = now.isBetween(startDate, endDate);

  return onMaintenance;
};

/**
 *
 * @param maintenanceStartDate
 * @param maintenanceEndDate
 */
const setMaintenanceWindow = async (
  maintenanceStartDate: string,
  maintenanceEndDate: string
) => {
  await ConfigModel.findOneAndUpdate(
    {},
    {
      maintenanceStartDate,
      maintenanceEndDate,
    }
  );
};

/**
 *
 * @returns
 */
const getMaintenanceWindow = async () => {
  const config = await Config.getConfigObject();
  let maintenanceStartDate = "";
  let maintenanceEndDate = "";

  if (config !== null) {
    maintenanceStartDate = _.get(config, "maintenanceStartDate", "");
    maintenanceEndDate = _.get(config, "maintenanceEndDate", "");
  }

  return {
    maintenanceStartDate,
    maintenanceEndDate,
  };
};

/**
 *
 * @returns
 */
const getMaintenanceInformation = async () => {
  const sourceConfig = await getMaintenanceWindow();
  const { maintenanceStartDate, maintenanceEndDate } = sourceConfig;

  const now = moment.tz(new Date(), timezone);
  const startDate = moment.tz(new Date(maintenanceStartDate), timezone);
  const endDate = moment.tz(new Date(maintenanceEndDate), timezone);
  const duration = moment.duration(endDate.diff(startDate));

  // is on maintenance
  const onMaintenance = now.isBetween(startDate, endDate);
  const hasIncomingMaintenance = now.isBefore(startDate);
  const serverTime = now.format(timestampFormat);

  return {
    maintenanceStartDate,
    maintenanceEndDate,
    onMaintenance,
    serverTime,
    hasIncomingMaintenance,
    duration: {
      minutes: duration.asMinutes(),
      seconds: duration.asSeconds(),
    },
  };
};

/**
 * 
 * @param life 
 */
const issueMaintenanceToken = (life: number) => {
  const token = uuidv4();

  // Add to redis.
  Cache.set(`ebgMaintenance:${token}`, token, { NX: true, EX: life });

  return token;
}

/**
 * 
 * @param token 
 */
const tokenExists = async (token: string) => {
  const key   = `ebgMaintenance:${token}`
  const value = await Cache.get(key);
  return value === token;
}

export default {
  getMaintenanceInformation,
  getMaintenanceWindow,
  setMaintenanceWindow,
  issueMaintenanceToken
};
