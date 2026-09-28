import { isDebug } from '../utils/debugMode';
import { appendErrorLog } from '../utils/errorLog';

/**
 * What a failed request was trying to do. Node's `fetch` rejects with a bare
 * `TypeError: fetch failed` that names neither the URL nor the method, so the
 * caller has to supply them.
 */
export interface IRequestContext {
  method: string;
  url: string;
}

interface IErrorLike {
  name?: string;
  message?: string;
  code?: string;
  errno?: number;
  syscall?: string;
  hostname?: string;
  stack?: string;
  cause?: unknown;
}

/**
 * Guards against a cause chain that loops back on itself, which a hand-rolled
 * wrapper can produce.
 */
const MAX_CAUSE_DEPTH = 10;

function asErrorLike(error: unknown): IErrorLike | null {
  return typeof error === 'object' && error !== null
    ? (error as IErrorLike)
    : null;
}

function describeLink(error: unknown): string {
  const err = asErrorLike(error);

  if (!err) {
    return String(error);
  }

  const label = `${err.name ?? 'Error'}: ${err.message ?? String(error)}`;
  const details = [
    err.code ? `code=${err.code}` : null,
    err.syscall ? `syscall=${err.syscall}` : null,
    err.hostname ? `hostname=${err.hostname}` : null,
    typeof err.errno === 'number' ? `errno=${err.errno}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${label} (${details.join(', ')})` : label;
}

function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;

  while (current !== undefined && current !== null) {
    if (chain.length >= MAX_CAUSE_DEPTH || chain.includes(current)) {
      break;
    }
    chain.push(current);
    current = asErrorLike(current)?.cause;
  }

  return chain;
}

function indent(text: string, prefix = '    '): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

/**
 * The diagnostic block for an error: the request attempted, the whole cause
 * chain, and the deepest stack.
 *
 * The whole chain is reported because the useful part of a fetch failure is
 * never the top link: `fetch failed` wraps the `ECONNREFUSED`,
 * `CERT_HAS_EXPIRED` or `UND_ERR_CONNECT_TIMEOUT` that actually explains it.
 *
 * Always built, whatever the flags — the error log records it even when the
 * user is not shown it.
 */
export function buildErrorDiagnostics(
  error: unknown,
  context?: IRequestContext,
): string {
  const lines: string[] = [];

  if (context) {
    lines.push(`  Request: ${context.method} ${context.url}`);
  }

  const chain = causeChain(error);
  lines.push('  Cause chain:');
  chain.forEach((link, index) => {
    lines.push(`    ${index + 1}. ${describeLink(link)}`);
  });

  const deepestStack = [...chain]
    .reverse()
    .map((link) => asErrorLike(link)?.stack)
    .find((stack): stack is string => typeof stack === 'string');

  if (deepestStack) {
    lines.push('  Stack:');
    lines.push(indent(deepestStack));
  }

  return lines.join('\n');
}

/**
 * The diagnostics as they are appended to a user-facing message. Empty unless
 * `--debug` was given, so call sites can append it unconditionally.
 */
export function formatErrorDiagnostics(
  error: unknown,
  context?: IRequestContext,
): string {
  if (!isDebug()) {
    return '';
  }

  return `\nDebug diagnostics:\n${buildErrorDiagnostics(error, context)}`;
}

/**
 * An error carrying `message` plus, under `--debug`, the diagnostics for
 * `cause`. The cause is attached by assignment rather than through the
 * `new Error(message, { cause })` overload, which the monorepo's `es2020` lib
 * does not declare.
 *
 * The diagnostics reach `~/.packmind/error.log` either way: a user who hits
 * this once should not have to reproduce it under `--debug` to report it.
 */
export function createDiagnosticError(
  message: string,
  cause: unknown,
  context?: IRequestContext,
): Error {
  const diagnostics = buildErrorDiagnostics(cause, context);

  appendErrorLog({ message, diagnostics });

  const error: Error & { cause?: unknown } = new Error(
    isDebug() ? `${message}\nDebug diagnostics:\n${diagnostics}` : message,
  );
  error.cause = cause;
  return error;
}
