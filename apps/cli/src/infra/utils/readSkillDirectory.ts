import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';

import { isBinaryFile } from './binaryDetection';

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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE_MB = 10;

/**
 * Glob patterns for files and directories that should be excluded from skill uploads.
 * Add patterns here to blacklist additional files or directories.
 */
const BLACKLIST_PATTERNS = ['**/.DS_Store'];

/**
 * Checks if a relative path matches any of the blacklist patterns.
 * Uses glob matching for flexible pattern specification.
 */
function isBlacklisted(relativePath: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return BLACKLIST_PATTERNS.some((pattern) =>
    minimatch(normalizedPath, pattern, { dot: true }),
  );
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

      // Skip blacklisted files and directories
      if (isBlacklisted(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await readDir(fullPath, basePath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        if (stat.size > MAX_FILE_SIZE_BYTES) {
          const fileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
          throw new Error(
            `File "${relativePath}" is ${fileSizeMB} MB which exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB per file.`,
          );
        }

        const buffer = await fs.readFile(fullPath);
        const isBinary = isBinaryFile(fullPath, buffer);
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
