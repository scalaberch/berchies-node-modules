import _ from "lodash";

const allowedDatabases = ['mongo', 'mysql']

export default (configObject: any) => {
  const enabledDatabases = allowedDatabases.filter((db: string) => configObject.hasOwnProperty(db));
  const mysql = _.get(configObject, 'mysql', {}) as object;
  
  return {
    enabledDatabases,
    mysql
  }
}