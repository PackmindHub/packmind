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

/** Lets a test isolate one run from the next. */
export function resetErrorLogDeduplication(): void {
  loggedThisRun.clear();
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
  loggedThisRun.add(signature);

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
  } catch {
    // Logging an error must never raise one.
  }
}
