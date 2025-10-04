import fs from 'fs'
import _ from 'lodash'
import { env } from "@modules/env"
import { execSync } from 'child_process'
import { mysqlSrcBasePath, mysqlClientPath, schemaFile, templateModelPath } from "./defines"
import { isStringIsSnakeCase, snakeCaseToCamelCase, capitalizeString } from "@modules/helpers"

/**
 * ensure that mysqlSrcBasePath exists
 * 
 * @returns
 */
const ensureMysqlModelFolderExists = () => {
  if (!fs.existsSync(mysqlSrcBasePath)) {
    fs.mkdirSync(mysqlSrcBasePath, { recursive: true })
  }
}

/**
 * generate initial content for prisma schema file
 * 
 * @returns 
 */
const generateInitialPrismaSchemaFileContent = () => {
  const mysqlDbUrl = `mysql://${env.MYSQL_USER}:${env.MYSQL_PASS}@${env.MYSQL_HOST}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`
  const fileContent = `generator client {\n\tprovider = "prisma-client-js"\n\toutput = "../../${mysqlClientPath}"\n}\n\ndatasource db {\n\tprovider = "mysql"\n\turl = "${mysqlDbUrl}"\n}\n`;
  return fileContent;
}

/**
 * 
 * @returns
 */
const generatePrismaSchemaFromExistingDatabase = async () => {
  try {
    const fileContent = generateInitialPrismaSchemaFileContent();
    fs.writeFileSync(schemaFile, fileContent, { encoding: 'utf8', flag: 'w' });
  } catch {
    console.error('Error writing schema file.');
  } finally {
    execSync(`npx prisma db pull --schema=${schemaFile}`, { encoding: 'utf8' });
  }
}

/**
 * 
 * @returns
 */
const generatePrismaClientFromSchema = async () => {
  // Make sure that the folder exists.
  const path = `./src/${mysqlClientPath}`;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true })
  }

  execSync(`npx prisma generate --schema=${schemaFile}`, { encoding: 'utf8' });
}

/**
 * 
 * @returns
 */
const cleanUpGeneratedSchemaFile = async () => {
  fs.unlinkSync(schemaFile);
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
 * 
 * @returns 
 */
const generateDefinitions = async () => {
  const schemaDefinition = parsePrismaSchema(schemaFile);
  const models = parseSchemaModels(schemaDefinition);

  return {
    models
  }
}

/**
 * 
 * @param models 
 * @returns 
 */
const generateModelFiles = async (models: object) => {
  // Get the template file.
  const templateFile = fs.readFileSync(templateModelPath, { encoding: 'utf-8'});

  for (const tableName in models) {
    const modelObject = models[tableName];
    const modelName = (isStringIsSnakeCase(tableName) ? capitalizeString(snakeCaseToCamelCase(tableName)) : capitalizeString(tableName)) + 'Table';
    const generatedClassContent = generateModelFileTemplate(modelObject, templateFile, modelName, tableName);

    // Create file.
    const modelFilePath = `${mysqlSrcBasePath}/${modelName}.ts`
    fs.writeFileSync(modelFilePath, generatedClassContent, { encoding: 'utf8', flag: 'w' });
  }
}

const generateModelFileTemplate = (modelObject, sourceTemplate: string, modelName: string, tableName: string) => {
  const { fields, primaryKey } = modelObject

  const updatedWithModelName = sourceTemplate.replaceAll("TemplateTableName", modelName);
  const updatedWithTableName = updatedWithModelName.replaceAll("tableName", tableName);
  const updatedWithPrimaryKey = updatedWithTableName.replaceAll("primaryKey", primaryKey);

  // Add up the fields;
  const fieldBaseMarker = "field: 'value'";
  const fieldVars = Object.values(fields).map((item: any) => (`${item.name}: '${item.type}'`))
  const classText = updatedWithPrimaryKey.replaceAll(fieldBaseMarker, fieldVars.join(",\n\t"));

  return classText
}


export default {
  ensureMysqlModelFolderExists,
  generatePrismaSchemaFromExistingDatabase,
  generatePrismaClientFromSchema,
  generateDefinitions,
  generateModelFiles,
  cleanUpGeneratedSchemaFile
}