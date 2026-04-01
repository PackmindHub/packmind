import * as path from 'path';
import * as fs from 'fs/promises';
import { logErrorConsole } from '../../utils/consoleLogger';

export function getRelativePath(dir: string, startDirectory: string): string {
  if (dir === startDirectory) return './packmind.json';
  return './' + path.relative(startDirectory, dir) + '/packmind.json';
}

export async function resolveStartDirectory(
  args: { path?: string },
  getCwd: () => string,
  exit: (code: number) => void,
): Promise<string | undefined> {
  let startDirectory = getCwd();

  if (args.path) {
    const resolvedPath = path.resolve(getCwd(), args.path);
    try {
      const stat = await fs.stat(resolvedPath);
      if (!stat.isDirectory()) {
        logErrorConsole(`Path is not a directory: ${resolvedPath}`);
        exit(1);
        return undefined;
      }
      startDirectory = resolvedPath;
    } catch {
      logErrorConsole(`Path does not exist: ${resolvedPath}`);
      exit(1);
      return undefined;
    }
  }

  return startDirectory;
}
