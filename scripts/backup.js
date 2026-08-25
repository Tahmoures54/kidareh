import { createBackup } from '../server/db.js';
import logger from '../server/logger.js';

try {
  const path = createBackup();
  logger.info(`✅ Backup created: ${path}`);
} catch (error) {
  logger.error('❌ Backup failed:', error);
  process.exit(1);
}