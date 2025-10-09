import fs from "fs";
import path from "path";
import { builtinModules } from "module";
import { fileURLToPath } from "url";

// --- Setup paths relative to this script ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The folder we want to scan (everything under modules/)
const MODULES_DIR = path.join(__dirname, "..");

// The output file: modules/package.json
const OUTPUT_FILE = path.join(MODULES_DIR, "package.jsonlist");

// --- Helper to check if a module is Node built-in ---
function isBuiltin(name) {
  // Handle both plain names (fs) and prefixed (node:fs)
  return (
    builtinModules.includes(name) ||
    builtinModules.includes(name.replace(/^node:/, ""))
  );
}

// --- Recursively collect JS/TS files ---
function getAllFiles(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Skip node_modules or the scripts folder itself
    if (stat.isDirectory()) {
      if (file === "node_modules" || file === "scripts") continue;
      results = results.concat(getAllFiles(fullPath));
    } else if (/\.(js|ts|jsx|tsx)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

// --- Extract imported packages from a file ---
function extractImports(content) {
  const matches = [
    ...content.matchAll(/require\(['"]([^'"]+)['"]\)/g),
    ...content.matchAll(/from ['"]([^'"]+)['"]/g),
    ...content.matchAll(/import\(['"]([^'"]+)['"]\)/g),
  ];
  return matches
    .map(m => m[1])
    .filter(pkg => !pkg.startsWith(".") && !pkg.startsWith("/"));
}

// --- Collect all third-party dependencies ---
const deps = new Set();

for (const file of getAllFiles(MODULES_DIR)) {
  const content = fs.readFileSync(file, "utf8");
  for (const dep of extractImports(content)) {
    const pkg = dep.startsWith("@")
      ? dep.split("/").slice(0, 2).join("/")
      : dep.split("/")[0];

    // ✅ Only include non-built-in packages
    if (!isBuiltin(pkg)) {
      deps.add(pkg);
    }
  }
}

// --- Generate package.json ---
const pkgJson = {
  name: "modules",
  version: "1.0.0",
  type: "module",
  dependencies: Object.fromEntries([...deps].map(d => [d, "*"])),
};

// --- Write it out ---
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pkgJson, null, 2));

console.log(`✅ Generated ${OUTPUT_FILE} with ${deps.size} third-party dependencies.`);
