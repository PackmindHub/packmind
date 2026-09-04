import winston from 'winston';

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
 * Renders one human-readable console line.
 *
 * `trace_id` / `span_id` / `trace_flags` are injected into every record by
 * @opentelemetry/instrumentation-winston whenever a span is active (see
 * apps/api/src/otel.ts). They are pulled out of the metadata here so they show
 * as a short marker rather than bloating the JSON blob on every line — the
 * `json()` format still carries them in full, which is what Loki and Grafana's
 * trace<->logs navigation rely on.
 *
 * Exported for testing: the console transport is unreachable under Jest, which
 * forces PACKMIND_LOG_LEVEL=silent globally.
 */
export function formatConsoleLine(
  info: winston.Logform.TransformableInfo,
): string {
  const { timestamp, level, message, label, trace_id: traceId } = info;

  const meta = Object.fromEntries(
    Object.entries(info).filter(([key]) => !RENDERED_FIELDS.includes(key)),
  );
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const traceStr = traceId ? ` [trace=${String(traceId).slice(0, 8)}]` : '';

  return `${timestamp} [${label}]${traceStr} ${level}: ${message}${metaStr}`;
}

/** Fields rendered explicitly above, so they must not be repeated in `meta`. */
const RENDERED_FIELDS = [
  'timestamp',
  'level',
  'message',
  'label',
  'trace_id',
  'span_id',
  'trace_flags',
];

export class PackmindLogger {
  private readonly logger: winston.Logger | null;
  private readonly name: string;
  private currentLevel: LogLevel;

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

    this.currentLevel = finalLevel;

    // Only create winston logger if not in silent mode
    if (finalLevel !== LogLevel.SILENT) {
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
              winston.format.printf(formatConsoleLine),
            ),
          }),
        ],
      });
    } else {
      this.logger = null;
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.currentLevel === LogLevel.SILENT || !this.logger) return;
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.currentLevel === LogLevel.SILENT || !this.logger) return;
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.currentLevel === LogLevel.SILENT || !this.logger) return;
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.currentLevel === LogLevel.SILENT || !this.logger) return;
    this.logger.debug(message, meta);
  }

  getName(): string {
    return this.name;
  }
}
