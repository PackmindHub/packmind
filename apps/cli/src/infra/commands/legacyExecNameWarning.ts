import { logWarningConsole } from '../utils/consoleLogger';
import {
  CANONICAL_EXEC_NAME,
  LEGACY_EXEC_NAME,
  isLegacyExecName,
} from '../utils/execName';

export const LEGACY_EXEC_NAME_WARNING = `\`${LEGACY_EXEC_NAME}\` is deprecated and will stop receiving updates. Use \`${CANONICAL_EXEC_NAME}\` instead.`;

/**
 * Warns once, on stderr, when the CLI was invoked under the deprecated
 * executable name. Called before anything else in `main.ts` so even early-exit
 * flags such as `--version` surface the deprecation.
 */
export function warnOnLegacyExecName(
  argv: readonly string[] = process.argv,
  logWarning: (message: string) => void = logWarningConsole,
): void {
  if (!isLegacyExecName(argv)) {
    return;
  }

  logWarning(LEGACY_EXEC_NAME_WARNING);
}
