const fs = require('fs');
const path = require('path');
const folderToUpdate = './src/models/mysql'; // Replace with your folder path.

function extractClassName(filePath) {
  const fileName = filePath.split('/').pop(); // Get the last part (filename)
  if (!fileName) {
    return null; // Handle cases where the path is empty or invalid
  }

  const classNameWithExtension = fileName.split('.')[0]; // Remove the extension

  return classNameWithExtension;
}

/**
 * Updates the contents of all TypeScript files in a given folder.
 *
 * @param {string} folderPath The path to the folder containing the TypeScript files.
 * @param {function(string, string): string} updateFunction A function that takes the file path and the file content as arguments and returns the updated content.
 */
function updateTypeScriptFiles(folderPath, updateFunction) {
  try {
    const files = fs.readdirSync(folderPath);

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        // Recursively process subdirectories if needed.
        updateTypeScriptFiles(filePath, updateFunction);
      } else if (file.endsWith('.ts')) {
        try {
          let fileContent = fs.readFileSync(filePath, 'utf8');
          const updatedContent = updateFunction(filePath, fileContent);

          if (updatedContent !== fileContent) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
          }
        } catch (readWriteError) {
          console.error(`Error processing ${filePath}:`, readWriteError);
        }
      }
    });
  } catch (dirError) {
    console.error(`Error reading directory ${folderPath}:`, dirError);
  }
}

function myUpdateFunction(filePath, content) {
  // Get the class name here
  const className = extractClassName(filePath);

  // Example: Add a comment to each .ts file.
  let topComment = `// Model: ${className}\n`;
  topComment += `// This is auto-generated model file using sequelize-auto and a custom script.\n`;
  topComment += `// Do not update this file. If you want to add to this model, create a new one and extend this model.\n\n`;

  //Example: replace all "oldString" with "newString"
  let updatedContent = content.replace(/import { DataTypes, Model, Optional } from 'sequelize';/g, "import { DataTypes, Optional } from 'sequelize';");
  updatedContent = updatedContent.replace(/extends Model/g, "extends EbgMysqlModel");
  updatedContent = updatedContent.replace("import * as Sequelize from 'sequelize';", "import * as Sequelize from 'sequelize';\nimport EbgMysqlModel from '@modules/database/mysql2/model';");

  // // Example: append a line.
  // updatedContent = updatedContent + "\n//Append line example.";

  // Example: prepend a line.
  updatedContent = topComment + updatedContent;

  return updatedContent;
}

updateTypeScriptFiles(folderToUpdate, myUpdateFunction)