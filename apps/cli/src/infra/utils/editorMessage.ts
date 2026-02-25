import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const MAX_MESSAGE_LENGTH = 1024;

const EDITOR_TEMPLATE = `
# Enter a message describing the intent behind these changes.
# Lines starting with '#' will be ignored.
# An empty message aborts the submission.
`;

export function openEditorForMessage(): string {
  const tmpFile = join(tmpdir(), `packmind-msg-${Date.now()}.txt`);

  try {
    writeFileSync(tmpFile, EDITOR_TEMPLATE, 'utf-8');

    const editor = process.env.EDITOR || process.env.VISUAL || 'vi';

    const result = spawnSync(editor, [tmpFile], {
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error(`Editor exited with status ${result.status}`);
    }

    const content = readFileSync(tmpFile, 'utf-8');

    return content
      .split('\n')
      .filter((line) => !line.startsWith('#'))
      .join('\n')
      .trim();
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

export function validateMessage(
  message: string,
): { valid: true; message: string } | { valid: false; error: string } {
  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters (got ${trimmed.length}).`,
    };
  }

  return { valid: true, message: trimmed };
}
