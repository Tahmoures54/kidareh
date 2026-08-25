#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('\n🔍 بررسی آمادگی پروژه برای Liara...\n');

// Check Node version
const requiredNodeVersion = 20;
const currentNodeVersion = parseInt(process.version.slice(1));

if (currentNodeVersion < requiredNodeVersion) {
  console.error(`❌ Node.js ${requiredNodeVersion}+ نیاز است`);
  process.exit(1);
}

// Check required files
const requiredFiles = ['liara.json', 'package.json', 'server.ts'];
const missingFiles = requiredFiles.filter((f) => !fs.existsSync(f));

if (missingFiles.length > 0) {
  console.error('❌ فایل‌های ضروری موجود نیستند:', missingFiles.join(', '));
  process.exit(1);
}

console.log('✅ پروژه برای استقرار آماده است\n');