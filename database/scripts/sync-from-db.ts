import 'dotenv/config';                     // load environment variables
import 'module-alias/register';
import PrismaDriver from '@modules/database/mysql/prisma'
import PrismaDriverUtils from '@modules/database/mysql/prisma/utils'

/**
 * 
 * we use this utility script so that we generate a prisma schema from an existing database
 * and then generate model classes per table based on the generate prisma schema
 * 
 * Steps:
 * 1. import a prisma schema from an existing database (prisma db pull)
 * 2. then we generate prisma client to default path (prisma generate)
 * 3. we generate json file definitions to be used as reference on src
 * 4. we generate custom model classes that will extend the base mysqltable class and stored them to src/models/mysql/
 * 5. we delete the schema file so that it wont have any trace on the source code itself.
 * 
 */

const main = async () => {
  // Step 0. Ensure all required filespaces
  PrismaDriverUtils.ensureMysqlModelFolderExists();

  // Step 1. import a prisma schema from an existing database (prisma db pull)
  await PrismaDriverUtils.generatePrismaSchemaFromExistingDatabase();

  // Step 2. we generate prisma client to default path (prisma generate)
  await PrismaDriverUtils.generatePrismaClientFromSchema();

  // Step 3. we generate json file definitions to be used as reference on src
  const { models } = await PrismaDriverUtils.generateDefinitions();

  // Step 4. we generate model classes that will extend the base mysqltable class and stored them to src/models/mysql/
  await PrismaDriverUtils.generateModelFiles(models)

  // Step 5. Delete the schema file so that it wont have any trace on the source code itself.
  await PrismaDriverUtils.cleanUpGeneratedSchemaFile();
}

main();

