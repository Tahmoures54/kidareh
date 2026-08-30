#!/usr/bin/env node

import fs from "fs";
import { execSync } from "child_process";

console.log("\n🔧 Running post-install setup...\n");

const requiredNodeVersion = 20;
const currentNodeVersion = parseInt(process.version.slice(1), 10);

if (currentNodeVersion < requiredNodeVersion) {
  console.error(
    `❌ Error: Node.js ${requiredNodeVersion}+ is required. You are using ${process.version}`,
  );
  process.exit(1);
}

// هماهنگ با server.ts ensureDirectories()
const dirs = [
  "data/uploads/products",
  "data/uploads/avatars",
  "data/uploads/stores",
  "data/logs",
  "data/backup",
  "data/database",
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}/`);
  }
}

if (!fs.existsSync(".env") && fs.existsSync(".env.example")) {
  fs.copyFileSync(".env.example", ".env");
  console.log("📄 Created .env file from .env.example");
}

// rebuild native module برای Node فعلی (مهم برای لیارا / CI)
try {
  execSync("npm rebuild better-sqlite3", { stdio: "inherit" });
  console.log("✅ better-sqlite3 rebuilt");
} catch {
  console.warn("⚠️  better-sqlite3 rebuild skipped (prebuild may still work)");
}

if (!process.env.CI && fs.existsSync(".git")) {
  try {
    execSync("npx husky install", { stdio: "inherit" });
    console.log("🔗 Git hooks installed");
  } catch {
    console.warn("⚠️  Failed to install git hooks");
  }
}

console.log("\n✅ Setup completed successfully!\n");
