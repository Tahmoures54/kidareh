import fs from "node:fs";
import path from "node:path";

const required = [
  "package.json", "tsconfig.json", "vite.config.ts",
  "src/data/processed/categories.ts", "src/data/processed/iranCities.ts",
  "server/server.ts", "server/routes/auth.ts", "server/routes/products.ts"
];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error("Missing required project files:");
  for (const file of missing) console.error(` - ${file}`);
  process.exit(1);
}
console.log("✓ Project structure check passed");
