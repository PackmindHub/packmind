import fs from 'fs/promises';
import path from 'path';

type SkillFile = {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  permissions: string;
};

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

        files.push({
          path: fullPath,
          relativePath,
          content,
          size: Buffer.byteLength(content, 'utf-8'),
          permissions: 'rw-r--r--', // Simple default
        });
      }
    }
  }

  await readDir(dirPath, dirPath);
  return files;
}
