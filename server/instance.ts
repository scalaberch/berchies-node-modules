import Mysql, { Db, query, settings } from "../database/mysql3";

const tableName = "";
export const instanceTTL = 60;

const create = async (application: any, appConfig: any) => {
  const { modules } = application;
  const isMysqlEnabled = modules.indexOf("mysqldb") >= 0;
  if (!isMysqlEnabled) {
    return false;
  }

  // Check if the table exists.
  await initialize();


};

const initialize = async () => {
  // const result = await Db()
  //   .selectFrom("information_schema.tables")
  //   .select(["table_name"])
  //   .where("table_schema", "=", "your_database_name")
  //   .where("table_name", "=", tableName)
  //   .execute();

  // const tableExists = result.length > 0;
  // if (!tableExists) {
  // }

  // console.log(settings)
};

export default {
  create,
};
