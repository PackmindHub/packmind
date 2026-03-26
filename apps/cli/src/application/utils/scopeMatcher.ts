import { minimatch } from 'minimatch';

export function buildEffectivePattern(
  targetPath: string,
  scope: string | null,
): string {
  // Normalize target path (remove trailing slash unless it's root)
  const normalizedTarget =
    targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');

  // If no scope, just use target path with wildcard
  if (!scope) {
    return normalizedTarget === '/' ? '/**' : normalizedTarget + '/**';
  }

  // Check if scope starts with target path
  if (scope.startsWith(normalizedTarget + '/') || scope === normalizedTarget) {
    // Use scope alone, ensure it has wildcard if it's a directory
    return scope.endsWith('/') ? scope + '**' : scope;
  }

  // Strip leading "/" from scope if present
  const cleanScope = scope.startsWith('/') ? scope.substring(1) : scope;

  // Concatenate target path and scope
  let pattern: string;
  if (normalizedTarget === '/') {
    // Root target - prepend slash to scope
    pattern = '/' + cleanScope;
  } else {
    // Non-root target - concatenate with slash
    pattern = normalizedTarget + '/' + cleanScope;
  }

  // If pattern ends with '/', add wildcard to match everything inside
  if (pattern.endsWith('/')) {
    pattern = pattern + '**';
  }

  return pattern;
}

export function isNegativePattern(pattern: string): boolean {
  return pattern.startsWith('!');
}

export function fileMatchesTargetAndScope(
  filePath: string,
  targetPath: string,
  scopePatterns: string[],
): boolean {
  // File path is expected to already be normalized (relative to git root, starting with '/')

  // If no scope patterns, check if file is within target path
  if (!scopePatterns || scopePatterns.length === 0) {
    const effectivePattern = buildEffectivePattern(targetPath, null);
    return minimatch(filePath, effectivePattern, { matchBase: false });
  }

  const positivePatterns = scopePatterns.filter((p) => !isNegativePattern(p));
  const negativePatterns = scopePatterns.filter((p) => isNegativePattern(p));

  // At least one positive pattern is required for a file to be in scope
  if (positivePatterns.length === 0) {
    return false;
  }

  // Check if file matches ANY positive pattern
  const matchesPositive = positivePatterns.some((scopePattern) => {
    const effectivePattern = buildEffectivePattern(targetPath, scopePattern);
    return minimatch(filePath, effectivePattern, { matchBase: false });
  });

  if (!matchesPositive) {
    return false;
  }

  // Check exclusions: a file is excluded if it matches any negative pattern
  if (negativePatterns.length > 0) {
    const matchesNegative = negativePatterns.some((scopePattern) => {
      // Strip '!' and build the effective pattern for matching
      const effectivePattern = buildEffectivePattern(
        targetPath,
        scopePattern.substring(1),
      );
      return minimatch(filePath, effectivePattern, { matchBase: false });
    });

    if (matchesNegative) {
      return false;
    }
  }

  return true;
}
