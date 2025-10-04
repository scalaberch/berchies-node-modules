import fs from "fs";
import _ from 'lodash'
// import { Prisma, PrismaClient } from "@prisma/client"
// import { Prisma, PrismaClient } from "@src/database/mysql"
import { execSync } from "child_process"
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone'
import Defines, { schemaFile, timestampFields, deleteTimestampField, tableTypeMap, MysqlTable, mysqlSrcBasePath } from './defines'
import { fetchAllFiles } from "../../../helpers";

/**
 * call this during server startup. this will ensure that primas got initialized properly!
 * 
 * @returns
 */
const initialize = async () => {
  // Execute reload of schema.
  if (!fs.existsSync(schemaFile)) {
    // const result = execSync(`npx prisma generate --schema=${schemaFile}`, { encoding: 'utf8' });
    // console.log(result)
    // const result = execSync(`npm run sync-db`, { encoding: 'utf-8'})
    // console.log(result);
  }

  // Create database instance.
  const _database = createDbInstance();

  // // Auto load all models that are inside the source file.
  // const _models = autoloadModels(_database);

  // Load the object
  const mysql = {
    query: (queryString: any, params: Array<any> = []) => callQueryRaw(_database, queryString, params),
    execute: (queryString: any, params: Array<any> = []) => callExecuteRaw(_database, queryString, params),
    table: (tableName: string) => {
      // if (!_models.hasOwnProperty(tableName)) {
      //   throw `Table ${tableName} does not exist in the schema!`;
      // }

      // return _models[tableName]
    },
    database: _database
  }

  const shutdown = () => {
    // _database.$disconnect();

    if (fs.existsSync(schemaFile)) {
      fs.unlinkSync(schemaFile)
    }
  }

  // Return helpers
  return {
    mysql,
    listener: null,
    shutdown,
    getInstance: () => _database,
    connect: () => {
      // _database.$connect(), 
    },
    disconnect: () => {
      // _database.$disconnect();
    }, 
  }
}

const autoloadModels = (dbInstance) => {
  const _modules = {};
  const modelFiles: Array<string> = fetchAllFiles(mysqlSrcBasePath, [], ['README.md', '.DS_Store', 'mysql.prisma']);

  if (modelFiles.length > 0) {
    const allowedExtensions = ['ts', 'js']

    for (const modelFile of modelFiles) {
      const moduleFile = modelFile.split("/").pop()?.split(".");
      if (moduleFile.length === 0) {
        continue;
      }
      if (allowedExtensions.indexOf(moduleFile[1]) < 0) {
        continue;
      }
      
      // // const moduleName = moduleFile[0] || "";
      // const relativeFilePath = modelFile.replace(mysqlSrcBasePath, "");
      // const path = `${process.cwd()}/src/models/mysql${relativeFilePath}`;
      // const module = require(path);
      
      // const modelInitializer = _.get(module, module.initialize, null);
      // if (modelInitializer !== null) {
      //   modelInitializer(dbInstance)
      // }

      // console.log(module);
      // console.log(module.dbTableName)

      // // Pass the actual database instance to the model items.
      // const modelClass = module.default.modelClass
      // _modules[module.dbTableName] = new modelClass(dbInstance);
    }
  }

  return _modules;
}

/**
 * checks if the schema file exists or not!
 * 
 * @returns 
 */
const checkIfSchemaFileExists = async () => fs.existsSync(schemaFile);

/**
 * creates a new prisma db client
 * 
 * @returns 
 */
const createDbInstance = () => {
  // new PrismaClient() 
}

/**
 * execute a sql string manually.
 * 
 * @param db 
 * @param sqlString 
 * @param params 
 * @returns 
 */
const callQueryRaw = async (db: any, sqlString: string, params: Array<any>) => {
  // return await db.$queryRaw(Prisma.sql([sqlString], ...params));
}

/**
 * execute a sql string manually.
 * 
 * @param db 
 * @param sqlString 
 * @param params 
 * @returns 
 */
const callExecuteRaw = async (db: any, sqlString: string, params: Array<any>) => {
  // return await db.$executeRaw(Prisma.sql([sqlString], ...params));
}

/**
 * parse the schema file to a friendlier format (json)
 * 
 * @param schemaPath 
 * @returns 
 */
const parsePrismaSchema = (schemaPath) => {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const jsonSchema: any = {};

  let currentModel = null;

  schema.split('\n').forEach((line) => {
    line = line.trim();

    // Skip comments and empty lines
    if (line.startsWith('//') || line === '') return;

    // Detect model or enum
    const modelMatch = line.match(/^model\s+(\w+)\s+{$/);
    const enumMatch = line.match(/^enum\s+(\w+)\s+{$/);

    if (modelMatch) {
      currentModel = { name: modelMatch[1], fields: [] };
      jsonSchema.models = jsonSchema.models || [];
      jsonSchema.models.push(currentModel);
    } else if (enumMatch) {
      currentModel = { name: enumMatch[1], values: [] };
      jsonSchema.enums = jsonSchema.enums || [];
      jsonSchema.enums.push(currentModel);
    } else if (line === '}') {
      currentModel = null; // End of model/enum
    } else if (currentModel) {
      if (currentModel.fields) {
        // Parse model fields
        const fieldMatch = line.match(/^(\w+)\s+(\w+)(.*)$/);
        if (fieldMatch) {
          const [_, name, type, attributes] = fieldMatch;
          currentModel.fields.push({ name, type, attributes: attributes.trim() });
        }
      } else if (currentModel.values) {
        // Parse enum values
        const valueMatch = line.match(/^(\w+)(.*)$/);
        if (valueMatch) {
          const [_, name, attributes] = valueMatch;
          currentModel.values.push({ name, attributes: attributes.trim() });
        }
      }
    }
  });

  return jsonSchema;
}

/**
 * further dive in and parse the models
 * 
 * @param schemaJSON 
 * @returns 
 */
const parseSchemaModels = (schemaJson: any) => {
  const modelList = _.get(schemaJson, 'models', []);

  const models = modelList.reduce((list, model) => {
    const { name, fields } = model;
    const fieldList = fields.reduce((sublist, field) => ({ ...sublist, [field.name]: field }), {})
    const primaryField = fields.filter(fld => fld.attributes.includes('@id'))
    const primaryKey = primaryField.length === 0 ? '' : primaryField[0].name;

    // @todo: find all other tables that has possible "connections" so that we can be track them easier during "deletes"

    return { ...list, [name]: { fields: fieldList, primaryKey } }
  }, {});

  return models
}

/**
 * generates the timestamp
 * 
 * @returns 
 */
const generateTimestampNow = () => moment().toISOString()

/**
 * helping to prepare a create payload
 * 
 * @param data 
 * @param referenceFields 
 * @returns 
 */
const prepareCreatePayload = (data: any, referenceFields: any, primaryKey: string) => {
  // First check on the payload if all the attributes exist in the model reference?
  for (const payloadField in data) {
    if (!referenceFields.hasOwnProperty(payloadField)) {
      delete data[payloadField];
    }
  }

  // Create the id!
  data[primaryKey] = uuidv4();

  // Add the timestamps
  const now = generateTimestampNow();
  for (const timestampField of timestampFields) {
    if (referenceFields.hasOwnProperty(timestampField)) {
      data[timestampField] = now;
    }
  }

  return data
}

const createModelMap = () => {
  
}


export default {
  initialize,
  createDbInstance
}