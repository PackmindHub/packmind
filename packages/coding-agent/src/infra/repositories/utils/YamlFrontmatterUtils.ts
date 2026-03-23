import { escapeSingleQuotes } from './FileUtils';

/**
 * Formats an additional property value as YAML frontmatter.
 * Handles nested objects, arrays, and scalar values recursively.
 */
export function formatAdditionalPropertyYaml(
  key: string,
  value: unknown,
  indent = 0,
): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    const isSimpleArray = value.every(
      (item) => item === null || typeof item !== 'object',
    );
    if (isSimpleArray) {
      const inlineItems = value.map(formatYamlScalar).join(', ');
      return `${pad}${key}: [${inlineItems}]`;
    }
    const items = value
      .map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>).sort(
            ([a], [b]) => a.localeCompare(b),
          );
          if (entries.length === 0) return `${pad}- {}`;
          const [firstKey, firstVal] = entries[0];
          const firstLine = formatEntryValue(
            firstKey,
            firstVal,
            indent + 2,
            `${pad}- `,
          );
          const rest = entries
            .slice(1)
            .map(([k, v]) => formatEntryValue(k, v, indent + 2, `${pad}  `))
            .join('\n');
          return rest ? `${firstLine}\n${rest}` : firstLine;
        }
        return `${pad}- ${formatYamlScalar(item)}`;
      })
      .join('\n');
    return `${pad}${key}:\n${items}`;
  }
  if (value !== null && typeof value === 'object') {
    const nestedYaml = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => formatAdditionalPropertyYaml(k, v, indent + 2))
      .join('\n');
    return `${pad}${key}:\n${nestedYaml}`;
  }
  return `${pad}${key}: ${formatYamlScalar(value)}`;
}

export function formatYamlScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `'${escapeSingleQuotes(value)}'`;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  return `'${escapeSingleQuotes(String(value))}'`;
}

/**
 * Formats a key-value entry, recursing into complex values (objects/arrays)
 * instead of falling through to formatYamlScalar which would produce [object Object].
 */
export function formatEntryValue(
  key: string,
  value: unknown,
  indent: number,
  prefix: string,
): string {
  if (value !== null && typeof value === 'object') {
    const nested = formatAdditionalPropertyYaml(key, value, indent);
    // Replace the leading whitespace with the provided prefix for the first line
    return `${prefix}${nested.trimStart()}`;
  }
  return `${prefix}${key}: ${formatYamlScalar(value)}`;
}
