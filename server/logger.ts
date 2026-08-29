import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'kidareh-api' },
  transports: [
    new winston.transports.Console({
      format: isDevelopment
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...metadata }) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
              }
              return msg;
            })
          )
        : winston.format.combine(
            winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
              const base = `${timestamp} [${level}]: ${message}`;
              const extra = stack ? `\n${stack}` : '';
              const metaStr =
                Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
              return base + metaStr + extra;
            })
          ),
    }),
  ],
});

export default logger;
