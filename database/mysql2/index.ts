import { getEnv } from "@modules/env";
import { mysqlSettings, isMysqlEnabled } from "./defines"
import Helpers from "./helpers";
import BaseMethods from "./methods"
import { Sequelize } from "sequelize";
// import SequelizeAuto, { CaseOption } from "sequelize-auto"

export const MAX_SERVER_ID = 4294967295;

const executeRawSql = async (sql: string) => {

}

const loadConfig = () => {

}

/**
 * initialize the database module
 * 
 * @returns 
 */
const init = () => {
  const { database, username, password, host, port } = mysqlSettings

  // Initialize database connection
  const sequelize = new Sequelize(database, username, password, {
    dialect: 'mysql',
    host,
    port,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
  })

  return {
    sequelize,

    /**
     * attempts to connect to the database
     * @returns
     */
    connect: () => Helpers.testConnection(sequelize),

    /**
     * disconnects to the database
     * @returns
     */
    disconnect: () => sequelize.close(),

    /**
     * 
     * @param dbName 
     * @returns 
     */
    getTables: (dbName = '') => Helpers.getTables(sequelize, dbName),

    /**
     * executes a query
     * 
     * @param sql 
     * @param parameters 
     * @returns 
     */
    execute: (sql: string, parameters = []) => Helpers.executeRawQuery(sequelize, sql, parameters, true),


    t: () => {
    }
  }
}







export default {
  init
}