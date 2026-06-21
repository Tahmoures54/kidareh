import db from '../server/db.js';
import logger from '../server/logger.js';

logger.info('🔄 Running migrations...');
// Migrations خودکار با db.ts اجرا می‌شوند
logger.info('✅ Migrations completed!');