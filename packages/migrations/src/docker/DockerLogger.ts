/**
 * Log levels enum to match PackmindLogger
 */
export enum LogLevel {
  SILENT = 'silent',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Simplified logger for Docker migrations.
 * Provides the same interface as PackmindLogger but with simpler console output.
 */
export class DockerLogger {
  private readonly name: string;
  private currentLevel: LogLevel;

  constructor(name: string, level: LogLevel = LogLevel.INFO) {
    this.name = name;
    this.currentLevel = level;
  }

  private log(
    level: string,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    if (this.currentLevel === LogLevel.SILENT) return;
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(
      `${timestamp} [${this.name}] ${level.toUpperCase()}: ${message}${metaStr}`,
    );
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.log('http', message, meta);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getName(): string {
    return this.name;
  }
}
