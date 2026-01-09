import fs from 'fs/promises';
import path from 'path';

type SkillFile = {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  permissions: string;
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
        const content = await fs.readFile(fullPath, 'utf-8');
        const normalizedContent = normalizeLineEndings(content);
        const normalizedPath = normalizePath(relativePath);

        files.push({
          path: fullPath,
          relativePath: normalizedPath,
          content: normalizedContent,
          size: Buffer.byteLength(normalizedContent, 'utf-8'),
          permissions: 'rw-r--r--', // Simple default
        });
      }
    }
  }

  await readDir(dirPath, dirPath);
  return files;
}
