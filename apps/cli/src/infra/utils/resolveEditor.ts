import * as which from 'which';

export const EDITOR_NOT_FOUND_MESSAGE =
  'No text editor found. Set the EDITOR environment variable to your preferred editor, or pass the message inline with -m "<message>".';

const WINDOWS_CANDIDATES = ['notepad'] as const;
const UNIX_CANDIDATES = ['nano', 'vim', 'vi'] as const;

function isAvailable(cmd: string): boolean {
  try {
    which.sync(cmd);
    return true;
  } catch {
    return false;
  }
}

export function resolveEditor(
  platform: NodeJS.Platform = process.platform,
): string {
  if (process.env.VISUAL) {
    return process.env.VISUAL;
  }
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }

  const candidates =
    platform === 'win32' ? WINDOWS_CANDIDATES : UNIX_CANDIDATES;
  for (const candidate of candidates) {
    if (isAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(EDITOR_NOT_FOUND_MESSAGE);
}
