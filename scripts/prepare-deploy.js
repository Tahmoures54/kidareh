#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('\n?? ÂãÇÏåÓÇÒí Ñæå ÈÑÇí Liara...\n');

// Check Node version
const requiredNodeVersion = 20;
const currentNodeVersion = parseInt(process.version.slice(1));

if (currentNodeVersion < requiredNodeVersion) {
  console.error(`? Node.js ${requiredNodeVersion}+ ãæÑÏ äíÇÒ ÇÓÊ`);
  process.exit(1);
}

// Check required files
const requiredFiles = ['liara.json', 'package.json', 'server.ts'];
const missingFiles = requiredFiles.filter(f => !fs.existsSync(f));

if (missingFiles.length > 0) {
  console.error('? İÇíáåÇí ÖÑæÑí íÇİÊ äÔÏ:', missingFiles.join(', '));
  process.exit(1);
}

console.log('? ÂãÇÏåÓÇÒí ãæİŞ\n');