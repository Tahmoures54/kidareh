import db from '../server/db.js';
import logger from '../server/logger.js';

logger.info('🔄 Running migrations...');
// Migrations are handled automatically by db.ts
logger.info('✅ Migrations completed!');