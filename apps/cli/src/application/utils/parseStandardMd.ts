export type ParsedStandardMd = {
  name: string;
  description: string;
};

export function parseStandardMd(content: string): ParsedStandardMd | null {
  const lines = content.split('\n');
  let name: string | null = null;
  let nameLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      const extracted = lines[i].slice(2).trim();
      if (extracted) {
        name = extracted;
        nameLineIndex = i;
        break;
      }
    }
  }

  if (!name) {
    return null;
  }

  const descriptionLines: string[] = [];
  for (let i = nameLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      break;
    }
    descriptionLines.push(lines[i]);
  }

  const description = descriptionLines.join('\n').trim();

  return { name, description };
}
