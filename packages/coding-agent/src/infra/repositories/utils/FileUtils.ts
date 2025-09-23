import { Target } from '@packmind/shared';

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
