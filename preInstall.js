const fs = require("fs");

const sourceFilePath = "./package.json";
const targetFilePath = "./modules/package.template.json";

const packageJson = JSON.parse(fs.readFileSync(sourceFilePath, "utf8"));
console.log(packageJson.dependencies);
// Extract dependencies
const dependencies = packageJson.dependencies;

// Read and parse the target JSON file
let targetJson = JSON.parse(fs.readFileSync(targetFilePath, "utf8"));

// Append or merge dependencies
targetJson.dependencies = { ...targetJson.dependencies, ...dependencies };
// devDependencies
const devDependencies = packageJson.devDependencies;
targetJson.devDependencies = {
  ...targetJson.devDependencies,
  ...devDependencies,
};

//save module package.json
fs.writeFileSync(targetFilePath, JSON.stringify(targetJson, null, 2));

packageJson.dependencies = targetJson.dependencies;

packageJson.devDependencies = targetJson.devDependencies;

// save  main package.json
fs.writeFileSync(sourceFilePath, JSON.stringify(packageJson, null, 2));
