const { createLogger, format, transports } = require('winston');
const LokiTransport = require('winston-loki');

const isProduction = process.env.NODE_ENV === 'production';

// Base log format for console output
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

const loggerTransports = [
  new transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')
  })
];

// Configure Grafana Loki if credentials are provided in environment
const lokiHost = process.env.GRAFANA_LOKI_HOST || process.env.LOKI_HOST;
const lokiUser = process.env.GRAFANA_LOKI_USER || process.env.LOKI_USER;
const lokiToken = process.env.GRAFANA_LOKI_TOKEN || process.env.LOKI_TOKEN;
const lokiAuth = process.env.GRAFANA_LOKI_BASIC_AUTH || (lokiUser && lokiToken ? `${lokiUser.trim()}:${lokiToken.trim()}` : null);

if (lokiHost && lokiAuth) {
  try {
    const lokiTransport = new LokiTransport({
      host: lokiHost.replace(/\/$/, ''),
      basicAuth: lokiAuth,
      labels: {
        app: process.env.OTEL_SERVICE_NAME || 'fintrack-backend',
        env: process.env.NODE_ENV || 'production'
      },
      json: true,
      format: format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => {
        console.error('[Loki Error] Failed to stream logs to Grafana Loki:', err.message);
      }
    });

    loggerTransports.push(lokiTransport);
    console.log(`[Logger] 🪵 Grafana Loki streaming enabled (${lokiHost})`);
  } catch (err) {
    console.error('[Logger] Failed to configure Loki transport:', err.message);
  }
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports: loggerTransports,
  exitOnError: false
});

// Dedicated helper for audit logging
logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, audit: true });
};

module.exports = logger;
