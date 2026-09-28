import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { version } from '../../../package.json';

const ERROR_LOG_DIR = '.packmind';
const ERROR_LOG_FILE = 'error.log';

/**
 * Past this size the log is rotated to `error.log.old`, keeping at most two
 * files. Nothing prunes this directory, so an unbounded append would grow on
 * the user's disk forever.
 */
const MAX_LOG_BYTES = 1024 * 1024;

export function getErrorLogPath(): string {
  return path.join(os.homedir(), ERROR_LOG_DIR, ERROR_LOG_FILE);
}

/**
 * The subcommand that was run, options stripped.
 *
 * Arguments are deliberately dropped rather than redacted: `packmind login
 * --code <code>` carries a credential, and a value worth hiding is easier to
 * leave out than to recognise. The leading non-flag tokens are enough to tell
 * `skills list` from `install`.
 */
function invokedCommand(argv: readonly string[]): string {
  const subcommand: string[] = [];

  for (const arg of argv) {
    if (arg.startsWith('-')) {
      break;
    }
    subcommand.push(arg);
  }

  return ['packmind', ...subcommand].join(' ');
}

function indent(text: string, prefix = '    '): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function rotateIfOversized(logPath: string): void {
  if (fs.statSync(logPath).size <= MAX_LOG_BYTES) {
    return;
  }
  fs.renameSync(logPath, `${logPath}.old`);
}

/**
 * Signatures already written by this process.
 *
 * A gateway that retries writes the identical failure once per attempt — a
 * single failed `install` produced twelve byte-identical entries — which
 * buries the distinct failures around it. The retry count is not worth the
 * noise in a file meant to be read by a human.
 */
const loggedThisRun = new Set<string>();

/** Messages already recorded, so a summary does not restate a full report. */
const loggedMessages: string[] = [];

/** Lets a test isolate one run from the next. */
export function resetErrorLogDeduplication(): void {
  loggedThisRun.clear();
  loggedMessages.length = 0;
}

/**
 * Whether `message` only restates an entry already in the log.
 *
 * Commands decorate on the way out — `Failed to list skills:` wrapped around
 * what the gateway raised — and that restatement is worth skipping. Plain
 * containment is not enough to decide it: `Invalid API key` contains nothing
 * of `Invalid API key: missing organizationId`, yet one contains the other as
 * text, and treating them as the same would drop a distinct failure. So the
 * surrounding text has to be decoration and nothing else — a prefix ending in
 * a colon, and no trailing content.
 */
function isRestatementOf(message: string, logged: string): boolean {
  if (message === logged) {
    return true;
  }

  const start = message.indexOf(logged);
  if (start === -1) {
    return false;
  }

  const before = message.slice(0, start);
  const after = message.slice(start + logged.length);

  return /^[^\n]*:\s*$/.test(before) && after.trim() === '';
}

function isAlreadyCovered(message: string): boolean {
  return loggedMessages.some((logged) => isRestatementOf(message, logged));
}

export interface IErrorLogRecord {
  /** The message the user saw. */
  message: string;
  /** The diagnostic block, as `buildErrorDiagnostics` renders it. */
  diagnostics?: string;
  /** Defaults to the arguments this process was run with. */
  argv?: readonly string[];
  /** Defaults to now. Injected by tests. */
  now?: Date;
}

/**
 * Appends one error to `~/.packmind/error.log`, whether or not `--debug` was
 * given — the point is that a user who hits a failure once can send the file
 * rather than having to reproduce it under the flag.
 *
 * Best-effort: a read-only home directory or a full disk must never turn a
 * reportable error into a crash, so every failure here is swallowed.
 */
export function appendErrorLog(record: IErrorLogRecord): void {
  const signature = `${record.message}\n${record.diagnostics ?? ''}`;
  if (loggedThisRun.has(signature)) {
    return;
  }
  try {
    const logDir = path.join(os.homedir(), ERROR_LOG_DIR);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }

    const logPath = getErrorLogPath();
    if (fs.existsSync(logPath)) {
      rotateIfOversized(logPath);
    }

    const timestamp = (record.now ?? new Date()).toISOString();
    const command = invokedCommand(record.argv ?? process.argv.slice(2));

    const entry = [
      `[${timestamp}] ${command} (cli ${version})`,
      record.message,
      ...(record.diagnostics ? [record.diagnostics] : []),
      '',
    ].join('\n');

    fs.appendFileSync(logPath, entry, { mode: 0o600 });

    // Recorded only once the entry is actually on disk: a write that failed
    // must not stop a later attempt in the same run from succeeding.
    loggedThisRun.add(signature);
    loggedMessages.push(record.message);
  } catch {
    // Logging an error must never raise one.
  }
}

/**
 * Marks an error whose diagnostics are already in the log.
 *
 * One failure surfaces at several layers — the HTTP client builds it, the use
 * case lets it through, the command catches it — and each has a reason to
 * report. The tag rides the error itself rather than relying on its message,
 * which callers decorate on the way up.
 */
const REPORTED = Symbol.for('packmind.cli.errorReported');

export function isReported(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<symbol, unknown>)[REPORTED] === true
  );
}

export function markReported(error: unknown): void {
  if (typeof error !== 'object' || error === null) {
    return;
  }

  try {
    Object.defineProperty(error, REPORTED, {
      value: true,
      enumerable: false,
      configurable: true,
    });
  } catch {
    // A frozen or sealed rejection value cannot carry the tag. Losing it
    // costs a duplicate entry; letting the TypeError out would replace the
    // failure the user came to see.
  }
}

/**
 * Records a message reported straight to the console, for the failures raised
 * and handled inside a command — a missing path, a rejected argument — which
 * never pass a use case and so have no error object to report.
 *
 * Skipped when a full report already covers the text, so the richer entry is
 * not restated without its diagnostics.
 */
function reportingSite(message: string): string | undefined {
  const stack = new Error(message).stack;
  if (!stack) {
    return undefined;
  }

  // Drop this module's own frames, so the stack opens on the handler that
  // reported rather than on the plumbing that recorded it.
  const frames = stack
    .split('\n')
    .filter(
      (line) =>
        !line.includes('reportingSite') &&
        !line.includes('recordReportedMessage') &&
        !line.includes('logErrorConsole'),
    );

  return `  Reported at:\n${indent(frames.join('\n'))}`;
}

export function recordReportedMessage(message: string): void {
  if (isAlreadyCovered(message)) {
    return;
  }

  appendErrorLog({
    message,
    diagnostics: reportingSite(message),
  });
}
