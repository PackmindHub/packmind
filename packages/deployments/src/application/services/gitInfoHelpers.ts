import slug from 'slug';

/**
 * Generate a target name from the relative path
 * @param relativePath The relative path (e.g., "/src/packages/")
 * @returns A slugified name for the target
 */
export function generateTargetName(relativePath: string): string {
  // Handle root path
  if (relativePath === '/' || relativePath === '') {
    return 'Default';
  }

  // Remove leading/trailing slashes, replace internal slashes with hyphens, and slugify
  const cleanPath = relativePath.split('/').filter(Boolean).join('-');
  return slug(cleanPath, { lower: true });
}

/**
 * Normalize relative path to ensure it has proper format (starts and ends with /)
 * @param relativePath The relative path
 * @returns Normalized path
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
