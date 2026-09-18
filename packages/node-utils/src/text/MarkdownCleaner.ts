/**
 * Returns the contents of the FIRST fenced block (```, ```tsx, ...). Input with
 * no fence is returned untouched, so already-bare content passes through.
 */
export function extractCodeFromMarkdown(inputMarkdown: string): string {
  const codeBlockPattern = /```(?:\w+)?\n([\s\S]*?)\n```/;
  const match = inputMarkdown.match(codeBlockPattern);

  if (match) {
    return match[1];
  }

  return inputMarkdown;
}
