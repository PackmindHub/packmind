import slug from 'slug';

/**
 * Slugified target name for a relative path: "/src/packages/" -> "src-packages".
 */
export function generateTargetName(relativePath: string): string {
  if (relativePath === '/' || relativePath === '') {
    return 'Default';
  }

  const cleanPath = relativePath.split('/').filter(Boolean).join('-');
  return slug(cleanPath, { lower: true });
}

/**
 * Normalizes a relative path so it starts and ends with "/".
 */
export function normalizeRelativePath(relativePath: string): string {
  if (!relativePath || relativePath === '/') {
    return '/';
  }

  let normalized = relativePath;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/';
  }
  return normalized;
}
