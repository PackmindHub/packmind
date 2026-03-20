export function isDeepValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'object' && item !== null);
  }
  return true;
}

export function toYamlLike(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const isSimpleArray = value.every((item) => !isDeepValue(item));
    if (isSimpleArray) {
      return `[${value.join(', ')}]`;
    }
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const entries = Object.entries(item);
          if (entries.length === 0) return `${pad}- {}`;
          return entries
            .map(([k, v], i) => {
              const linePrefix = i === 0 ? `${pad}- ` : `${pad}  `;
              if (isDeepValue(v)) {
                return `${linePrefix}${k}:\n${toYamlLike(v, indent + 2)}`;
              }
              return `${linePrefix}${k}: ${String(v)}`;
            })
            .join('\n');
        }
        if (isDeepValue(item)) {
          return `${pad}-\n${toYamlLike(item, indent + 1)}`;
        }
        return `${pad}- ${String(item)}`;
      })
      .join('\n');
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, v]) => {
      if (isDeepValue(v)) {
        return `${pad}${k}:\n${toYamlLike(v, indent + 1)}`;
      }
      return `${pad}${k}: ${String(v)}`;
    })
    .join('\n');
}
