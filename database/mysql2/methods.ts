import { result } from "lodash";
import { QueryTypes } from "sequelize";

/**
 * 
 * @param sequelize 
 * @param sql 
 * @param replacements 
 * @param includeMetadata 
 * @returns 
 */
const executeRawQuery = async (sequelize, sql: string, replacements = {}, includeMetadata = false) => {
  const type = getSqlQueryType(sql)

  try {
    const [results, metadata] = await sequelize.query(sql, {
      replacements,
      type,
    });

    if (includeMetadata) {
      return { metadata, results }
    }

    return results;
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
  executeRawQuery,
}