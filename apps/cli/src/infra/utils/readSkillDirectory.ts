import fs from 'fs/promises';
import path from 'path';

type SkillFile = {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  permissions: string;
  isBase64: boolean;
};

/**
 * Normalizes file path by:
 * 1. Converting backslashes to forward slashes
 * 2. Removing leading slash or backslash
 */
function normalizePath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.startsWith('\\')) {
    normalized = normalized.substring(1);
  }
  return normalized;
}

/**
 * Normalizes line endings by:
 * 1. Converting CRLF (\r\n) to LF (\n)
 * 2. Converting CR (\r) to LF (\n)
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Detects if a buffer contains binary content using Git's algorithm:
 * A file is considered binary if it contains a null byte (0x00) in the first 8000 bytes.
 */
function isBinaryBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0x00);
}

export async function readSkillDirectory(
  dirPath: string,
): Promise<SkillFile[]> {
  const files: SkillFile[] = [];

  async function readDir(currentPath: string, basePath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        await readDir(fullPath, basePath);
      } else if (entry.isFile()) {
        const buffer = await fs.readFile(fullPath);
        const isBinary = isBinaryBuffer(buffer);
        const normalizedPath = normalizePath(relativePath);

        let content: string;
        if (isBinary) {
          content = buffer.toString('base64');
        } else {
          content = normalizeLineEndings(buffer.toString('utf-8'));
        }

        files.push({
          path: fullPath,
          relativePath: normalizedPath,
          content,
          size: Buffer.byteLength(content, isBinary ? 'base64' : 'utf-8'),
          permissions: 'rw-r--r--', // Simple default
          isBase64: isBinary,
        });
      }
    }
  }

  await readDir(dirPath, dirPath);
  return files;
}
