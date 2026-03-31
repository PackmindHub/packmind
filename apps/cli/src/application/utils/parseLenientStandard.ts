import { normalizeLineEndings } from './normalizeLineEndings';

export type LenientStandardResult = {
  name: string;
  description: string;
  rules: string[];
};

export function parseLenientStandard(
  content: string,
): LenientStandardResult | null {
  content = normalizeLineEndings(content);

  if (!content.trim()) {
    return null;
  }

  let lines = content.split('\n');

  // Strip frontmatter block (--- ... ---)
  if (lines[0]?.trim() === '---') {
    const closingIdx = lines.findIndex(
      (line, i) => i > 0 && line.trim() === '---',
    );
    if (closingIdx !== -1) {
      lines = lines.slice(closingIdx + 1);
    }
  }

  // Find first main heading: `# Name` or `## Standard: Name`
  let headingIdx = -1;
  let name = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# Standard: ')) {
      const text = line.slice('# Standard: '.length).trim();
      if (text) {
        name = text;
        headingIdx = i;
        break;
      }
    } else if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      if (text) {
        name = text;
        headingIdx = i;
        break;
      }
    }
  }

  if (headingIdx === -1) {
    return null;
  }

  // Collect body lines, skipping subheadings
  const bodyLines: Array<{ line: string; isBullet: boolean }> = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) continue;
    bodyLines.push({
      line,
      isBullet: line.startsWith('* ') || line.startsWith('- '),
    });
  }

  // Identify contiguous bullet list groups
  type ListGroup = { startIdx: number; endIdx: number; items: string[] };
  const listGroups: ListGroup[] = [];
  let currentGroup: ListGroup | null = null;
  for (let i = 0; i < bodyLines.length; i++) {
    if (bodyLines[i].isBullet) {
      if (!currentGroup) {
        currentGroup = { startIdx: i, endIdx: i, items: [] };
        listGroups.push(currentGroup);
      }
      currentGroup.endIdx = i;
      currentGroup.items.push(bodyLines[i].line.slice(2).trim());
    } else {
      currentGroup = null;
    }
  }

  const joinAndClean = (bLines: Array<{ line: string }>) =>
    bLines
      .map((b) => b.line)
      .join('\n')
      .trim()
      .replace(/\s*:\s*$/, '');

  if (listGroups.length === 0) {
    return { name, description: joinAndClean(bodyLines), rules: [] };
  }

  const lastGroup = listGroups[listGroups.length - 1];
  const hasTextAfterLastList = bodyLines
    .slice(lastGroup.endIdx + 1)
    .some((b) => !b.isBullet && b.line.trim() !== '');

  if (hasTextAfterLastList) {
    // Text after the last list: all content goes into description, no rules
    return { name, description: joinAndClean(bodyLines), rules: [] };
  }

  // Last list becomes rules; everything before it becomes description
  const rules = lastGroup.items;
  const description = joinAndClean(bodyLines.slice(0, lastGroup.startIdx));
  return { name, description, rules };
}
