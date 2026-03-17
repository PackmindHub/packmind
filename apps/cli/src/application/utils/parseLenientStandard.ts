import path from 'path';

import { normalizeLineEndings } from './normalizeLineEndings';

export type LenientStandardResult = {
  name: string;
  description: string;
};

export function parseLenientStandard(
  content: string,
  filePath: string,
): LenientStandardResult | null {
  content = normalizeLineEndings(content);

  if (!content.trim()) {
    return null;
  }

  const lines = content.split('\n');
  let headingIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (lines[i].startsWith('# ')) {
      const name = lines[i].slice(2).trim();
      if (name) {
        headingIndex = i;
        const description = lines
          .slice(headingIndex + 1)
          .join('\n')
          .trim();
        return { name, description };
      }
    }
    break;
  }

  const stem = path.basename(filePath, path.extname(filePath));
  return {
    name: stem,
    description: content.trim(),
  };
}
