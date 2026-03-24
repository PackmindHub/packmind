import * as path from 'path';

/**
 * Normalizes path separators to forward slashes for consistent cross-platform comparison.
 * This is needed because:
 * - Git always returns paths with forward slashes
 * - Node.js path module uses OS-native separators (backslashes on Windows)
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Checks if a file path starts with a given prefix, handling path separator normalization.
 * This ensures consistent comparison across platforms (Windows vs Unix).
 */
export function pathStartsWith(filePath: string, prefix: string): boolean {
  const normalizedFile = normalizePath(filePath);
  const normalizedPrefix = normalizePath(prefix);
  return (
    normalizedFile.startsWith(normalizedPrefix + '/') ||
    normalizedFile === normalizedPrefix
  );
}

/**
 * Resolves the skill directory path from a given absolute path.
 * If the path ends with 'SKILL.md', returns the parent directory.
 * Otherwise, returns the path unchanged.
 */
export function resolveSkillDirPath(absolutePath: string): string {
  if (absolutePath.endsWith('SKILL.md')) {
    return path.dirname(absolutePath);
  }
  return absolutePath;
}
