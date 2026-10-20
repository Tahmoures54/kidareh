import { createBackup } from '../server/db.js';
import logger from '../server/logger.js';

try {
  const path = await createBackup();
  logger.info(`✅ Backup created and completed: ${path}`);
} catch (error) {
  logger.error('❌ Backup failed:', error);
  process.exitCode = 1;
}
