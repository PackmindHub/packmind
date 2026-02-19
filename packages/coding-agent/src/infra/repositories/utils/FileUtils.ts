import { Target } from '@packmind/types';

/**
 * Escape single quotes in YAML values to prevent parsing errors
 */
export function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

export function getTargetPrefixedPath(
  filePath: string,
  target: Target,
): string {
  if (target.path === '/') {
    return filePath;
  }

  // Remove leading "/" from target path before prefixing
  let cleanTargetPath = target.path.startsWith('/')
    ? target.path.slice(1)
    : target.path;

  // Ensure target path ends with "/" for proper concatenation
  if (!cleanTargetPath.endsWith('/')) {
    cleanTargetPath += '/';
  }

  return `${cleanTargetPath}${filePath}`;
}
