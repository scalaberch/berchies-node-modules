require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const PrismaDriver = require("./modules/database/mysql/prisma/index.ts")

const env = process.env;
const environment = env.ENV;
const host = environment === 'dev' ? '127.0.0.1' : env.MYSQL_HOST
const mysqlDbUrl = `mysql://${env.MYSQL_USER}:${env.MYSQL_PASS}@${host}:${env.MYSQL_PORT}/${env.MYSQL_DATABASE}`

// Create the file to src folder
const modelFolder = "./src/models/"
const schemaFileName = "mysql.prisma"
const filePath = `${modelFolder}${schemaFileName}`

try {
  const content = `generator client {\n\tprovider = "prisma-client-js"\n}\n\ndatasource db {\n\tprovider = "mysql"\n\turl = "${mysqlDbUrl}"\n}\n`;
  fs.writeFileSync(filePath, content, { encoding: 'utf8', flag: 'w' });
} catch (error) {
  console.error('Error writing file:', error);
}

// Then we run the command
execSync(`npx prisma db pull --schema=${filePath}`, { encoding: 'utf8' });

// Then we re-generate the prisma library.
execSync(`npx prisma generate --schema=${filePath}`, { encoding: 'utf8' });

// Then we generate the model files whenever we can manually.

