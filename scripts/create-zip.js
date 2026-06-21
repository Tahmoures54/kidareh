#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = require('../package.json').version;
const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const zipName = `kidareh-v${version}-${timestamp}.zip`;

console.log(`\n?? «ÌÃ«œ ›«Ì·: ${zipName}\n`);

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
  '.env.example'
];

try {
  // Try 7zip first
  try {
    execSync('7z --help', { stdio: 'ignore' });
    execSync(`7z a -tzip "${zipName}" ${filesToZip.join(' ')} -mx=9`, {
      stdio: 'inherit'
    });
  } catch {
    // Fallback to zip
    execSync(`zip -r -9 "${zipName}" ${filesToZip.join(' ')}`, {
      stdio: 'inherit'
    });
  }

  const stats = fs.statSync(zipName);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`\n? ›«Ì· “ÌÅ «ÌÃ«œ ‘œ!`);
  console.log(`?? ${zipName}`);
  console.log(`?? ${sizeMB} MB\n`);
  
} catch (err) {
  console.error('\n? Œÿ« œ— «ÌÃ«œ “ÌÅ:', err.message);
  process.exit(1);
}