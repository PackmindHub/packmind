export interface AdditionalPropertyDiffLine {
  type: 'removed' | 'added';
  text: string;
}

/**
 * Formats a skill additional property diff into display lines.
 *
 * The sentinel `'null'` (JSON-serialized null) represents absence:
 * - oldValue='null' means the property is being added (no removal line).
 * - newValue='null' or empty means the property is being removed (no addition line).
 */
export function formatAdditionalPropertyDiff(
  targetId: string,
  oldValue: string,
  newValue: string,
): AdditionalPropertyDiffLine[] {
  const lines: AdditionalPropertyDiffLine[] = [];

  if (oldValue && oldValue !== 'null') {
    lines.push({ type: 'removed', text: `${targetId}: ${oldValue}` });
  }

  if (newValue && newValue !== 'null') {
    lines.push({ type: 'added', text: `${targetId}: ${newValue}` });
  }

  return lines;
}
