const FRONTMATTER_DELIMITER = '---';

export function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    return content;
  }

  const contentAfterOpening = normalized.slice(
    FRONTMATTER_DELIMITER.length + 1,
  );
  const closingIndex = contentAfterOpening.indexOf(
    `\n${FRONTMATTER_DELIMITER}`,
  );

  if (closingIndex === -1) {
    return content;
  }

  return contentAfterOpening
    .slice(closingIndex + FRONTMATTER_DELIMITER.length + 1)
    .trimStart();
}
