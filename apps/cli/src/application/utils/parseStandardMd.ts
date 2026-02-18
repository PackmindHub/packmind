export type ParsedStandardMd = {
  name: string;
};

export function parseStandardMd(content: string): ParsedStandardMd | null {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const name = line.slice(2).trim();
      if (name) {
        return { name };
      }
    }
  }
  return null;
}
