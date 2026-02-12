const FRONTMATTER_DELIMITER = '---';

export function stripFrontmatter(content: string): string {
  if (!content.startsWith(`${FRONTMATTER_DELIMITER}\n`)) {
    return content;
  }

  const contentAfterOpening = content.slice(FRONTMATTER_DELIMITER.length + 1);
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
