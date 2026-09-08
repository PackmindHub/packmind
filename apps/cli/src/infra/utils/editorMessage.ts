import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveEditor } from './resolveEditor';

const EDITOR_TEMPLATE = `
# Enter a message describing the intent behind these changes.
# Lines starting with '#' will be ignored.
# An empty message aborts the submission.
`;

export function openEditorForMessage(prefill?: string): string {
  const editor = resolveEditor();
  const tmpFile = join(tmpdir(), `packmind-msg-${Date.now()}.txt`);

  try {
    writeFileSync(tmpFile, prefill ?? EDITOR_TEMPLATE, 'utf-8');

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
