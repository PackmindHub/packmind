/**
 * Normalizes line endings by:
 * 1. Converting CRLF (\r\n) to LF (\n)
 * 2. Converting CR (\r) to LF (\n)
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
