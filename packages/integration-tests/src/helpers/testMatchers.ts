export function expectContentToContainAll(
  content: string,
  expectedStrings: string[],
): void {
  const missingStrings = expectedStrings.filter(
    (str) => !content.includes(str),
  );

  if (missingStrings.length > 0) {
    throw new Error(
      `Content is missing the following strings:\n${missingStrings.map((s) => `  - "${s}"`).join('\n')}\n\nActual content:\n${content}`,
    );
  }
}
