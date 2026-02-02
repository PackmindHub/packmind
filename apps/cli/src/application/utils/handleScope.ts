export function handleScope(scope: string | null | string[]): string[] {
  if (scope === null) {
    return [];
  }

  if (typeof scope === 'string') {
    return scope
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return scope.flatMap((s) =>
    s
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}
