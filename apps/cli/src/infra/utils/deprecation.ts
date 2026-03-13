import * as path from 'path';

const DEPRECATED_BINARY_NAME = 'packmind-cli';

/**
 * Checks if the CLI was invoked using the deprecated `packmind-cli` name
 * and logs a deprecation warning if so.
 */
export function checkDeprecatedBinaryName(): void {
  const basename = path.win32.basename(process.argv[1] ?? '');
  const invokedAs = basename.replace(/\.(cmd|ps1|exe)$/, '');

  if (invokedAs === DEPRECATED_BINARY_NAME) {
    console.warn(
      `\x1b[33mWarning: '${DEPRECATED_BINARY_NAME}' is deprecated and will be removed in a future release. Please use 'packmind' instead.\x1b[0m`,
    );
  }
}
