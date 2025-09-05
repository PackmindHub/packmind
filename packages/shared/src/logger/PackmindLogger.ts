import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export class PackmindLogger {
  private readonly logger: winston.Logger;
  private readonly name: string;

  constructor(name: string, level: LogLevel = LogLevel.INFO) {
    this.name = name;

    // Check for environment variable override
    const envLogLevel = process.env['PACKMIND_LOG_LEVEL'];
    let finalLevel = level;

    if (
      envLogLevel &&
      Object.values(LogLevel).includes(envLogLevel as LogLevel)
    ) {
      finalLevel = envLogLevel as LogLevel;
    }

    this.logger = winston.createLogger({
      level: finalLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.label({ label: this.name }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, label, ...meta }) => {
                const metaStr = Object.keys(meta).length
                  ? ` ${JSON.stringify(meta)}`
                  : '';
                return `${timestamp} [${label}] ${level}: ${message}${metaStr}`;
              },
            ),
          ),
        }),
      ],
    });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  silly(message: string, meta?: Record<string, unknown>): void {
    this.logger.silly(message, meta);
  }

  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    this.logger.log(level, message, meta);
  }

  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  getName(): string {
    return this.name;
  }
}
