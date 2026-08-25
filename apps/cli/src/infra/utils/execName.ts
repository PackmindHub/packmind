/**
 * The canonical executable name. Everything user-facing should point at this
 * one, and the install script installs the real binary under this name.
 */
export const CANONICAL_EXEC_NAME = 'packmind';

/**
 * The legacy executable name, kept as an alias of {@link CANONICAL_EXEC_NAME}.
 * Deprecated since 0.35.0 — it will be dropped in a later release.
 */
export const LEGACY_EXEC_NAME = 'packmind-cli';

const KNOWN_EXEC_NAMES: readonly string[] = [
  LEGACY_EXEC_NAME,
  CANONICAL_EXEC_NAME,
];

/**
 * Virtual filesystem prefix a `bun build --compile` binary uses for its
 * embedded entrypoint. Such a path holds the build outfile name — a
 * compile-time constant — never the name the user typed, so it must never be
 * read as the invoked name.
 */
const BUNFS_PREFIX = '/$bunfs/';

/**
 * Splits on both separators rather than using `path.basename`, so a Windows
 * path resolves the same way whatever platform the code runs on.
 */
function basenameWithoutExeExtension(candidate: string): string {
  const basename = candidate.split(/[/\\]/).pop() ?? '';
  return basename.replace(/\.exe$/i, '');
}

/**
 * Matches case-insensitively, and returns the canonically-spelled name, so a
 * `PACKMIND-CLI.EXE` invocation on a case-insensitive filesystem still yields a
 * name the user can actually run. This mirrors how `updateHandler` compares the
 * running executable's basename.
 */
function matchKnownExecName(candidate: string): string | undefined {
  if (candidate.includes(BUNFS_PREFIX)) {
    return undefined;
  }

  const name = basenameWithoutExeExtension(candidate).toLowerCase();
  return KNOWN_EXEC_NAMES.find((known) => known === name);
}

/**
 * Resolves the name the CLI was invoked under.
 *
 * `process.argv0` is the only field that carries what the user actually typed,
 * so it is consulted first. The other candidates are fallbacks that only help
 * on some channels:
 * - standalone executable (`bun build --compile`): `argv0` is the invoked path
 *   (symlink included), while `argv[0]` is the literal string `"bun"` and
 *   `argv[1]` is a `/$bunfs/root/<outfile>` path — both compile-time constants.
 * - npm bin shim: `argv0` is the JS runtime (`node`, `bun`, …) and `argv[1]` is
 *   the shim path, whose basename is the invoked name.
 *
 * Anything we cannot recognise (a direct `node main.cjs`, a renamed binary)
 * falls back to the canonical name rather than guessing, so messages never
 * suggest a command the user cannot run.
 */
export function resolveExecName(
  argv: readonly string[] = process.argv,
  argv0: string = process.argv0,
): string {
  for (const candidate of [argv0, argv[0], argv[1]]) {
    if (!candidate) {
      continue;
    }
    const name = matchKnownExecName(candidate);
    if (name) {
      return name;
    }
  }

  return CANONICAL_EXEC_NAME;
}

/**
 * Whether the CLI was invoked under the deprecated {@link LEGACY_EXEC_NAME}.
 */
export function isLegacyExecName(
  argv: readonly string[] = process.argv,
  argv0: string = process.argv0,
): boolean {
  return resolveExecName(argv, argv0) === LEGACY_EXEC_NAME;
}

/**
 * The name the CLI was invoked under, resolved once at startup so every
 * message in a single run agrees on it.
 *
 * Use this in any user-facing string that names a command to run.
 */
export const EXEC_NAME = resolveExecName();
