#!/usr/bin/env node

import fs from 'fs';
import os from 'os';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

console.log('\n' + '═'.repeat(50));
console.log('📋 PROJECT INFO');
console.log('═'.repeat(50) + '\n');

console.log(`Name:        ${pkg.name}`);
console.log(`Version:     ${pkg.version}`);
console.log(`Description: ${pkg.description}\n`);

console.log('═'.repeat(50));
console.log('🖥️  SYSTEM INFO');
console.log('═'.repeat(50) + '\n');

console.log(`Platform:    ${os.platform()}`);
console.log(`Arch:        ${os.arch()}`);
console.log(`Node:        ${process.version}`);
console.log(`NPM:         ${process.env.npm_config_user_agent?.split(' ')[0] || 'unknown'}`);
console.log(`CPUs:        ${os.cpus().length}`);
console.log(`Memory:      ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\n`);

console.log('═'.repeat(50) + '\n');