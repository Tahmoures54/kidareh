#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

const version = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const zipName = `kidareh-v${version}-${timestamp}.zip`;

console.log(`\n📦 ایجاد فایل زیپ: ${zipName}\n`);

const filesToZip = [
  'server',
  'src',
  'public',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'server.ts',
  'liara.json',
  '.liaraignore',
  '.env.example',
];

try {
  try {
    execSync('7z --help', { stdio: 'ignore' });
    execSync(`7z a -tzip "${zipName}" ${filesToZip.join(' ')} -mx=9`, {
      stdio: 'inherit',
    });
  } catch {
    execSync(`zip -r -9 "${zipName}" ${filesToZip.join(' ')}`, {
      stdio: 'inherit',
    });
  }

  const stats = fs.statSync(zipName);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ فایل زیپ با موفقیت ایجاد شد!`);
  console.log(`📁 ${zipName}`);
  console.log(`📊 ${sizeMB} MB\n`);
} catch (err) {
  console.error('\n❌ خطا در ایجاد زیپ:', err.message);
  process.exit(1);
}