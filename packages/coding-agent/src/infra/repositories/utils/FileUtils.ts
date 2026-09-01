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

/**
 * Split a Packmind scope into its individual globs.
 *
 * Scopes are comma-separated, but a glob may itself contain commas inside
 * braces (a `{ts,tsx}` extension group), so only commas at brace depth zero
 * separate one glob from the next.
 */
export function splitScopeGlobs(scope: string): string[] {
  const globs: string[] = [];
  let currentGlob = '';
  let braceDepth = 0;

  for (const char of scope) {
    if (char === '{') {
      braceDepth++;
      currentGlob += char;
    } else if (char === '}') {
      braceDepth--;
      currentGlob += char;
    } else if (char === ',' && braceDepth === 0) {
      const trimmed = currentGlob.trim();
      if (trimmed) {
        globs.push(trimmed);
      }
      currentGlob = '';
    } else {
      currentGlob += char;
    }
  }

  const trimmed = currentGlob.trim();
  if (trimmed) {
    globs.push(trimmed);
  }

  return globs;
}
