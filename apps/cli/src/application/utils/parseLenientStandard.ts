import { normalizeLineEndings } from './normalizeLineEndings';

export type LenientStandardResult = {
  name: string;
  description: string;
};

export function parseLenientStandard(
  content: string,
): LenientStandardResult | null {
  content = normalizeLineEndings(content);

  if (!content.trim()) {
    return null;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (lines[i].startsWith('# ')) {
      const name = lines[i].slice(2).trim();
      if (name) {
        const description = lines
          .slice(i + 1)
          .join('\n')
          .trim();
        return { name, description };
      }
    }
    break;
  }

  return null;
}
