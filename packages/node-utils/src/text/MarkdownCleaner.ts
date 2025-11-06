// If the code is embedded into snippets with ```, ```tsx, ... we must only keep the content
export function extractCodeFromMarkdown(inputMarkdown: string): string {
  // Match code blocks with optional language identifier
  // Pattern: ``` or ```language followed by newline, content, newline, ```
  const codeBlockPattern = /```(?:\w+)?\n([\s\S]*?)\n```/;
  const match = inputMarkdown.match(codeBlockPattern);

  if (match) {
    // Return the captured content between the backticks
    return match[1];
  }

  // If no code block found, return original input
  return inputMarkdown;
}
