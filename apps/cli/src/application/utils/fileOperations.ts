import * as fs from 'fs/promises';
import * as path from 'path';

export async function deleteFileOrDirectory(
  baseDirectory: string,
  filePath: string,
): Promise<boolean> {
  const fullPath = path.join(baseDirectory, filePath);
  const stat = await fs.stat(fullPath).catch(() => null);

  if (stat?.isDirectory()) {
    await fs.rm(fullPath, { recursive: true, force: true });
    await removeEmptyParentDirectories(fullPath, baseDirectory);
    return true;
  } else if (stat?.isFile()) {
    await fs.unlink(fullPath);
    await removeEmptyParentDirectories(fullPath, baseDirectory);
    return true;
  }

  return false;
}

export async function removeEmptyParentDirectories(
  fullPath: string,
  baseDirectory: string,
): Promise<void> {
  const normalizedBase = path.resolve(baseDirectory);
  let currentDir = path.dirname(path.resolve(fullPath));

  while (
    currentDir.startsWith(normalizedBase + path.sep) &&
    currentDir !== normalizedBase
  ) {
    const isEmpty = await isDirectoryEmpty(currentDir);
    if (!isEmpty) break;

    try {
      await fs.rmdir(currentDir);
    } catch {
      break;
    }
    currentDir = path.dirname(currentDir);
  }
}

async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length === 0;
  } catch {
    return false;
  }
}
