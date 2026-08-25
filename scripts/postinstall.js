#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('\n🔧 Running post-install setup...\n');

// Check Node.js version
const requiredNodeVersion = 20;
const currentNodeVersion = parseInt(process.version.slice(1));

if (currentNodeVersion < requiredNodeVersion) {
  console.error(
    `❌ Error: Node.js ${requiredNodeVersion}+ is required. You are using ${process.version}`
  );
  process.exit(1);
}

// Create necessary directories (keep in sync with server.ts ensureDirectories())
const dirs = [
  'logs',
  'uploads',
  'uploads/products',
  'uploads/avatars',
  'uploads/stores',
  'backup',
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}/`);
  }
});

// Check for .env file
if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
  fs.copyFileSync('.env.example', '.env');
  console.log('📄 Created .env file from .env.example');
}

// Git hooks setup (if not in CI)
if (!process.env.CI && fs.existsSync('.git')) {
  try {
    execSync('npx husky install', { stdio: 'inherit' });
    console.log('🔗 Git hooks installed');
  } catch (err) {
    console.warn('⚠️  Failed to install git hooks');
  }
}

console.log('\n✅ Setup completed successfully!\n');