import * as fs from 'fs/promises';
import * as path from 'path';

export type FileResult = {
  path: string;
  content: string;
};

export class ListFiles {
  public async listFilesInDirectory(
    directoryPath: string,
    extensions: string[],
    excludes: string[] = [],
  ): Promise<FileResult[]> {
    const results: FileResult[] = [];

    const normalizedExtensions = extensions.map((ext) =>
      ext.startsWith('.') ? ext : `.${ext}`,
    );
    const includeAllExtensions = normalizedExtensions.length === 0;

    await this.findFilesRecursively(
      directoryPath,
      normalizedExtensions,
      excludes,
      results,
      includeAllExtensions,
    );

    return results;
  }

  private async findFilesRecursively(
    directoryPath: string,
    extensions: string[],
    excludes: string[],
    results: FileResult[],
    includeAllExtensions: boolean,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        // Check if this path should be excluded
        if (this.shouldExcludePath(fullPath, excludes)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.findFilesRecursively(
            fullPath,
            extensions,
            excludes,
            results,
            includeAllExtensions,
          );
        } else if (entry.isFile()) {
          const fileExtension = path.extname(entry.name);

          if (includeAllExtensions || extensions.includes(fileExtension)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              results.push({
                path: fullPath,
                content,
              });
            } catch (readError) {
              console.error(`Error reading file ${fullPath}:`, readError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${directoryPath}:`, error);
    }
  }

  private shouldExcludePath(filePath: string, excludes: string[]): boolean {
    if (excludes.length === 0) {
      return false;
    }

    // Normalize the path for consistent comparison
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');

    for (const exclude of excludes) {
      if (this.matchesGlobPattern(normalizedPath, exclude)) {
        return true;
      }
    }

    return false;
  }

  private matchesGlobPattern(filePath: string, pattern: string): boolean {
    // Handle simple directory names (e.g., "node_modules", "dist")
    if (!pattern.includes('*') && !pattern.includes('/')) {
      const pathSegments = filePath.split('/');
      return pathSegments.some((segment) => segment === pattern);
    }

    // Convert glob pattern to regex
    // Replace ** with a placeholder, then * with [^/]*, then ** placeholder with .*
    let regexPattern = pattern
      .replace(/\*\*/g, '__DOUBLE_STAR__')
      .replace(/\*/g, '[^/]*')
      .replace(/__DOUBLE_STAR__/g, '.*')
      .replace(/\//g, '\\/');

    // Add anchors if the pattern doesn't start with ** or end with **
    if (!pattern.startsWith('**/')) {
      regexPattern = '(^|/)' + regexPattern;
    }
    if (!pattern.endsWith('/**')) {
      regexPattern = regexPattern + '($|/)';
    }

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }
}
