import * as path from 'path';

import { normalizeLineEndings } from './normalizeLineEndings';

const FRONTMATTER_DELIMITER = '---';

export type ParseCommandFileResult =
  | { success: true; parsed: { name: string; content: string } }
  | { success: false; error: string };

export function parseCommandFile(
  content: string,
  filePath: string,
): ParseCommandFileResult {
  content = normalizeLineEndings(content);

  if (!content || content.trim().length === 0) {
    return { success: false, error: 'File is empty' };
  }

  if (content.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    const contentAfterOpening = content.slice(FRONTMATTER_DELIMITER.length + 1);
    const closingIndex = contentAfterOpening.indexOf(
      `\n${FRONTMATTER_DELIMITER}`,
    );

    if (closingIndex === -1) {
      return {
        success: false,
        error: 'Malformed frontmatter: opening --- without closing ---',
      };
    }

    const frontmatter = contentAfterOpening.slice(0, closingIndex);
    const name = resolveName(frontmatter, filePath);
    const body = contentAfterOpening
      .slice(closingIndex + FRONTMATTER_DELIMITER.length + 1)
      .replace(/^\n+/, '');

    return { success: true, parsed: { name, content: body } };
  }

  const name = humanizeSlug(extractFilenameSlug(filePath));

  return { success: true, parsed: { name, content } };
}

function resolveName(frontmatter: string, filePath: string): string {
  const nameValue = extractFrontmatterValue(frontmatter, 'name');
  if (nameValue) return nameValue;

  return humanizeSlug(extractFilenameSlug(filePath));
}

function extractFrontmatterValue(frontmatter: string, key: string): string {
  for (const line of frontmatter.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}:`)) {
      const raw = trimmed.slice(key.length + 1).trim();
      return stripYamlQuotes(raw);
    }
  }
  return '';
}

function stripYamlQuotes(value: string): string {
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
}

function extractFilenameSlug(filePath: string): string {
  let basename = path.basename(filePath);

  if (basename.endsWith('.prompt.md')) {
    basename = basename.slice(0, -'.prompt.md'.length);
  } else if (basename.endsWith('.md')) {
    basename = basename.slice(0, -'.md'.length);
  }

  return basename;
}

function humanizeSlug(slug: string): string {
  const words = slug.replace(/[-_]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
