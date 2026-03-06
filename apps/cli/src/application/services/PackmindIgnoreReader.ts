import * as fs from 'fs/promises';
import * as path from 'path';

const IGNORE_FILENAME = '.packmindignore';

export class PackmindIgnoreReader {
  async readIgnorePatterns(
    startDirectory: string,
    stopDirectory: string | null,
  ): Promise<string[]> {
    const patterns: string[] = [];

    const normalizedStart = path.resolve(startDirectory);
    const normalizedStop = stopDirectory ? path.resolve(stopDirectory) : null;

    // When stopDirectory is null (non-git repo), only read from startDirectory
    // to avoid collecting .packmindignore files from unrelated ancestor directories
    if (normalizedStop === null) {
      const ignoreFile = path.join(normalizedStart, IGNORE_FILENAME);
      return this.parseIgnoreFile(ignoreFile);
    }

    let currentDir = normalizedStart;

    while (true) {
      const ignoreFile = path.join(currentDir, IGNORE_FILENAME);
      const filePatterns = await this.parseIgnoreFile(ignoreFile);
      patterns.push(...filePatterns);

      if (currentDir === normalizedStop) {
        break;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }

    return patterns;
  }

  private async parseIgnoreFile(filePath: string): Promise<string[]> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      return [];
    }

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }
}
