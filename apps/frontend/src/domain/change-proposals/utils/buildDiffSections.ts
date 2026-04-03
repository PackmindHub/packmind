import { diffLines, Change } from 'diff';

export type DiffSection =
  | { type: 'unchanged'; value: string }
  | { type: 'changed'; oldValue: string; newValue: string };

export function buildDiffSections(
  oldValue: string,
  newValue: string,
): DiffSection[] {
  const changes: Change[] = diffLines(oldValue, newValue);
  const sections: DiffSection[] = [];
  let i = 0;
  while (i < changes.length) {
    const change = changes[i];
    if (!change.added && !change.removed) {
      sections.push({ type: 'unchanged', value: change.value });
      i++;
    } else if (change.removed) {
      const next = changes[i + 1];
      if (next && next.added) {
        sections.push({
          type: 'changed',
          oldValue: change.value,
          newValue: next.value,
        });
        i += 2;
      } else {
        sections.push({
          type: 'changed',
          oldValue: change.value,
          newValue: '',
        });
        i++;
      }
    } else if (change.added) {
      sections.push({ type: 'changed', oldValue: '', newValue: change.value });
      i++;
    }
  }
  return sections;
}
