import { QueryTypes } from "sequelize";

/**
 * convert table charset to utf8mb4
 *
 * @returns {void}
 */
export const convertToUtf8mb4 = async () => {
  // if (_db === null) {
  //   return Promise.resolve(false);
  // }

  // const tables = await _db("information_schema.columns")
  //   .select("table_name", "column_name", "character_set_name")
  //   .where("table_schema", config.database)
  //   .where("character_set_name", "utf8mb3");

  // if (tables.length > 0) {
  //   for (const table of tables) {
  //     // console.log(table);
  //     await _db.raw(
  //       `ALTER TABLE ${table.TABLE_NAME} MODIFY ${table.COLUMN_NAME} TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  //     );
  //   }
  // }

  // return Promise.resolve(true);
};

/**
 * call this to check if you can connect to the database
 * 
 * @param sequelize 
 * @returns 
 */
export const testConnection = async (sequelize) => {
  try {
    await sequelize.authenticate({ logging: false });
    return true;
  } catch (error) {
    console.log(`MySql connection error: `, error)
    return false;
  }
}

/**
 * 
 * @param sequelizeInstance 
 * @param dbName 
 */
const getTables = async (sequelizeInstance, dbName = '') => {
  try {
    let query;
    let results;

    const dialect = sequelizeInstance.getDialect();
    const databaseName = dbName === '' ? sequelizeInstance.config.database : dbName;

    switch (dialect) {
      case 'mysql':
      case 'mariadb':
        query = `SHOW TABLES FROM \`${databaseName}\``;
        [results] = await sequelizeInstance.query(query);
        results = results.map(row => row[`Tables_in_${databaseName}`]);
        break;

      case 'postgres':
        query = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_catalog = '${databaseName}'`;
        [results] = await sequelizeInstance.query(query);
        results = results.map(row => row.table_name);
        break;

      case 'sqlite':
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
        [results] = await sequelizeInstance.query(query);
        results = results.map(row => row.name);
        break;

      case 'mssql':
        query = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG = '${databaseName}'`;
        [results] = await sequelizeInstance.query(query);
        results = results.map(row => row.TABLE_NAME);
        break;

      default:
        throw new Error(`Dialect "${dialect}" is not supported for listing tables.`);
    }

    return results;
  } catch (error) {
    console.error('Error listing database tables:', error);
    throw error; // Rethrow to allow calling functions to handle the error
  }
}

/**
 * execute a raw query 
 * 
 * 
 * @param sequelize 
 * @param sqlString 
 * @param replacements 
 * @param includeMetadata 
 * @returns 
 */
const executeRawQuery = async (sequelize, sqlString: string, replacements = [], includeMetadata = false) => {
  const sql  = sqlString.trim(); 
  const type = getSqlQueryType(sql)

  try {
    const [results, metadata] = await sequelize.query(sql, {
      replacements,
      type: QueryTypes.RAW,
      // type,
      raw: true,
      logging: false
    });

    if (!includeMetadata) {
      return results;
    }

    let queryInfo   = metadata;
    let queryResult = results;

    if (type === QueryTypes.UPDATE || type === QueryTypes.DELETE) {
      queryInfo = { ...metadata, type }
      queryResult = [];
    } else if (type === QueryTypes.INSERT) {
      queryInfo = { insertId: results, added: metadata, type }
      queryResult = [];
    } else if (type === QueryTypes.SELECT) {
      queryInfo = {}
    }

    return { results: queryResult, metadata: queryInfo };
  } catch (error) {
    throw error;
  }
}

/**
 * gets the query type depending on the sql string
 * 
 * @param sql 
 * @returns 
 */
const getSqlQueryType = (sql: string) => {
  let queryType: string;
  const sqlLower = sql.trim().toLowerCase();
  
  if (sqlLower.startsWith('select')) {
    queryType = QueryTypes.SELECT;
  } else if (sqlLower.startsWith('insert')) {
    queryType = QueryTypes.INSERT;
  } else if (sqlLower.startsWith('update')) {
    queryType = QueryTypes.UPDATE;
  } else if (sqlLower.startsWith('delete')) {
    queryType = QueryTypes.DELETE;
  } else {
    queryType = QueryTypes.RAW; // Default to RAW if type cannot be determined.
  }

  return queryType
}



export default {
  testConnection,
  getTables,
  convertToUtf8mb4,
  executeRawQuery,
  getSqlQueryType
}