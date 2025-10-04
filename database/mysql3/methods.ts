import { Kysely, MysqlDialect, sql } from 'kysely';
import { WhereParameters } from "./defines"

/**
 * handle sql query if the input parameters are an array. format of query would be
 * SELECT * FROM table WHERE field = ? AND anotherField = ?
 * ['firstvalue', 'secondvalue']
 * 
 * @param db 
 * @param queryString 
 * @param params 
 * @returns 
 */
export const handleArrayParametersToSql = async<T>(db: Kysely<T>, queryString: string, params: any[]) => {
  const queryParts = queryString.split("?");
  if (queryParts.length - 1 !== params.length) {
    throw new Error("SQL query build error: Mismatch between placeholders and parameters.");
  }

  // Dynamically build the SQL query using sql.raw() and sql.lit()
  const kyselyQuery = queryParts.reduce((acc, part, index) => {
    return index < params.length
      ? sql`${acc}${sql.raw(part)}${sql.lit(params[index])}`
      : sql`${acc}${sql.raw(part)}`;
  }, sql``);

  // Execute the query using db.execute()
  const result = await kyselyQuery.execute(db);
  return result.rows;
}

/**
 * handle sql query if input parameters is an object. format of query would be
 * SELECT * FROM table WHERE field = :fieldName AND anotherField = :value
 * { fieldName = 'value', value: 'another value' }
 * 
 * @param db 
 * @param queryString 
 * @param params 
 * @returns 
 */
export const handleNamedParametersToSql = async<T>(
  db: Kysely<T>,
  queryString: string,
  params: Record<string, any> // Named parameters as an object
) => {
  // Find all named parameters (e.g., :name, :age) in the query
  const paramMatches: string[] = queryString.match(/:\w+/g) || [];

  // Reduce to replace `:paramName` with `sql.lit(value)`
  const kyselyQuery = paramMatches.reduce<{ query: any; remainingQuery: string }>(
    (acc, param) => {
      const paramName = param.slice(1); // Remove leading `:`

      if (!(paramName in params)) {
        throw new Error(`Missing parameter: ${paramName}`);
      }

      // Get the value and escape it safely
      const value = sql.lit(params[paramName]);

      // Split query before and after this parameter
      const [beforeParam, afterParam] = acc.remainingQuery.split(param, 2);

      return {
        query: sql`${acc.query}${sql.raw(beforeParam)}${value}`,
        remainingQuery: afterParam ?? "",
      };
    },
    { query: sql``, remainingQuery: queryString } // Initial accumulator
  );


  // Append any remaining query string after the last parameter
  const finalQuery = sql`${kyselyQuery.query}${sql.raw(kyselyQuery.remainingQuery)}`;

  // Execute the query using db.execute()
  const result = await finalQuery.execute(db);
  return result.rows;
}

/**
 * caveat: if output is TOO LARGE then system will output a 413 error. be careful!
 * 
 * @param db 
 * @param queryString 
 * @param params 
 * @returns 
 */
export const executeRawQuery = async<T>(
  db: Kysely<T>,
  queryString: string,
  params: any[] | Record<string, any>
): Promise<any[]> => {
  let result = [];

  try {
    result = Array.isArray(params) ?
      await handleArrayParametersToSql(db, queryString, params) :
      await handleNamedParametersToSql(db, queryString, params)
  } catch (err) {
    console.error('Error executing raw query:', err);
    throw err;
  }

  return result;
}

export const convertParameterObjectToWhereStatements = (qb: any, parameters: WhereParameters) => {

  for (const operator in parameters) {
    const value = parameters[operator];

    if (operator === '$or') {
      qb = qb.where((eb) => {
        const collection = [];

        for (const col of collection) {
          console.log(value);
        }
        return eb.or(collection);
      })
    }

    switch(operator){
      default:
        qb = qb.where(operator, '=', value);
    }
  }

  return qb;
}



export default {
  executeRawQuery,
  handleArrayParametersToSql,
  handleNamedParametersToSql,
  convertParameterObjectToWhereStatements
}