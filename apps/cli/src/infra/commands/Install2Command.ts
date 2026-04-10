import { command, restPositionals, string, option } from 'cmd-ts';
import * as path from 'path';
import * as fs from 'fs';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

function findSubDirectoriesWithPackmindJson(
  dirPath: string,
  recursive: boolean,
): string[] {
  const result: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(dirPath, entry.name);

    if (fs.existsSync(path.join(subDir, 'packmind.json'))) {
      result.push(subDir);
    }

    if (recursive) {
      result.push(...findSubDirectoriesWithPackmindJson(subDir, true));
    }
  }

  return result;
}

function mergeInstallResults(results: IInstallResult[]): IInstallResult {
  const merged: IInstallResult = {
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    contentFilesChanged: 0,
    errors: [],
    recipesCount: 0,
    standardsCount: 0,
    commandsCount: 0,
    skillsCount: 0,
    recipesRemoved: 0,
    standardsRemoved: 0,
    commandsRemoved: 0,
    skillsRemoved: 0,
    skillDirectoriesDeleted: 0,
    missingAccess: [],
    joinSpaceUrl: undefined,
  };

  for (const r of results) {
    merged.filesCreated += r.filesCreated;
    merged.filesUpdated += r.filesUpdated;
    merged.filesDeleted += r.filesDeleted;
    merged.contentFilesChanged += r.contentFilesChanged;
    merged.errors.push(...r.errors);
    merged.recipesCount += r.recipesCount;
    merged.standardsCount += r.standardsCount;
    merged.commandsCount += r.commandsCount;
    merged.skillsCount += r.skillsCount;
    merged.recipesRemoved += r.recipesRemoved;
    merged.standardsRemoved += r.standardsRemoved;
    merged.commandsRemoved += r.commandsRemoved;
    merged.skillsRemoved += r.skillsRemoved;
    merged.skillDirectoriesDeleted += r.skillDirectoriesDeleted;
    merged.missingAccess.push(...r.missingAccess);
    if (!merged.joinSpaceUrl && r.joinSpaceUrl) {
      merged.joinSpaceUrl = r.joinSpaceUrl;
    }
  }

  return merged;
}

function buildInstallSummary(result: IInstallResult): string {
  const contentParts = [
    result.standardsCount > 0
      ? `${result.standardsCount} ${result.standardsCount === 1 ? 'standard' : 'standards'}`
      : null,
    result.commandsCount > 0
      ? `${result.commandsCount} ${result.commandsCount === 1 ? 'command' : 'commands'}`
      : null,
    result.skillsCount > 0
      ? `${result.skillsCount} ${result.skillsCount === 1 ? 'skill' : 'skills'}`
      : null,
    result.recipesCount > 0
      ? `${result.recipesCount} ${result.recipesCount === 1 ? 'recipe' : 'recipes'}`
      : null,
  ].filter(Boolean);

  const contentChanged = result.contentFilesChanged > 0;

  if (!contentChanged && contentParts.length === 0) {
    return '✅ Nothing to install';
  }

  if (!contentChanged) {
    return `✅ Already up to date — ${contentParts.join(', ')}`;
  }

  if (contentParts.length === 0) {
    return '✅ Packages removed';
  }

  return `✅ Synced ${contentParts.join(', ')}`;
}

export async function install2Handler({
  installPath,
  packages,
}: {
  installPath: string;
  packages: string[];
}): Promise<void> {
  const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
  const packmindCliHexa = new PackmindCliHexa(packmindLogger);

  const cwd = installPath
    ? path.resolve(process.cwd(), installPath)
    : process.cwd();

  if (installPath) {
    if (!fs.existsSync(cwd)) {
      logErrorConsole(`Path does not exist: ${cwd}`);
      process.exit(1);
      return;
    }
    if (!fs.statSync(cwd).isDirectory()) {
      logErrorConsole(`Path is not a directory: ${cwd}`);
      process.exit(1);
      return;
    }
  }

  // Determine target directories
  let targetDirs: string[];

  if (installPath) {
    // With -p: find packmind.json in direct sub-directories only (non-recursive)
    targetDirs = findSubDirectoriesWithPackmindJson(cwd, false);
  } else {
    // Without -p: include root if it has packmind.json, then recursively find sub-directories
    targetDirs = [];
    if (fs.existsSync(path.join(cwd, 'packmind.json'))) {
      targetDirs.push(cwd);
    }
    targetDirs.push(...findSubDirectoriesWithPackmindJson(cwd, true));
  }

  // Fallback: if no config files found anywhere, run on cwd (use case will report the error)
  if (targetDirs.length === 0) {
    targetDirs = [cwd];
  }

  const results: IInstallResult[] = [];
  const thrownErrors: string[] = [];
  const multiDir = targetDirs.length > 1;

  for (const dir of targetDirs) {
    try {
      const result = await packmindCliHexa.install2({
        baseDirectory: dir,
        packages: packages.length > 0 ? packages : undefined,
      });
      results.push(result);

      if (result.missingAccess.length > 0) {
        let warning =
          `⚠️  You don't have access to the following packages (their artifacts were preserved from the lock file):\n` +
          result.missingAccess.map((s) => `  - ${s}`).join('\n');

        if (result.joinSpaceUrl) {
          warning += `\n\n  👉 Join the space to get access: ${result.joinSpaceUrl}`;
        }

        logWarningConsole(warning);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      thrownErrors.push(
        multiDir
          ? `[${dir}] install-2 failed: ${errorMessage}`
          : `install-2 failed: ${errorMessage}`,
      );
    }
  }

  const combined = mergeInstallResults(results);
  logConsole(buildInstallSummary(combined));

  const allErrors = [...combined.errors, ...thrownErrors];

  if (allErrors.length > 0) {
    logWarningConsole(`Encountered ${allErrors.length} error(s):`);
    allErrors.forEach((err) => logErrorConsole(`  - ${err}`));
  }

  if (thrownErrors.length > 0) {
    process.exit(1);
  }
}

export const install2Command = command({
  name: 'install-2',
  description:
    'Install packages using the new space-aware endpoint. Optionally specify package slugs (e.g. @my-space/my-package) to install.',
  args: {
    installPath: option({
      type: string,
      short: 'p',
      long: 'path',
      defaultValue: () => '',
      description:
        'Run install in the specified directory instead of the current directory',
    }),
    packages: restPositionals({
      type: string,
      displayName: 'packages',
      description: 'Package slugs to install (e.g. @my-space/my-package)',
    }),
  },
  handler: install2Handler,
});
