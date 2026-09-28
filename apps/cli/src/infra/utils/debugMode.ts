/**
 * The global `--debug` flag.
 *
 * `cmd-ts` declares options per command, so a flag every subcommand accepts
 * would have to be repeated in each `args` block — and would still be rejected
 * on the parent command. Instead the flag is stripped from argv before parsing
 * and kept here, which makes it genuinely global: `packmind skills list
 * --debug`, `packmind install --debug` and `packmind whoami --debug` all work,
 * and no command has to know about it.
 *
 * `lint` used to declare its own `--debug` for the log level. It now reads this
 * one, so the flag means the same thing on every command.
 */

export const DEBUG_FLAG = '--debug';

/**
 * Everything after a bare `--` is a positional the user meant literally, so the
 * flag is only recognised before it.
 */
const END_OF_FLAGS = '--';

let debug = false;

export function isDebug(): boolean {
  return debug;
}

export function setDebug(enabled: boolean): void {
  debug = enabled;
}

/**
 * Removes every occurrence of {@link DEBUG_FLAG} from `argv` and reports
 * whether one was present. Pure — the caller decides whether to enable the
 * mode, which keeps it testable without touching module state.
 */
export function extractDebugFlag(argv: readonly string[]): {
  args: string[];
  debug: boolean;
} {
  const args: string[] = [];
  let found = false;
  let literal = false;

  for (const arg of argv) {
    if (!literal && arg === END_OF_FLAGS) {
      literal = true;
    } else if (!literal && arg === DEBUG_FLAG) {
      found = true;
      continue;
    }
    args.push(arg);
  }

  return { args, debug: found };
}
