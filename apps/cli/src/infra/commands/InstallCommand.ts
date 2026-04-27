import { command, restPositionals, string, option, flag } from 'cmd-ts';
import * as path from 'path';
import * as fs from 'fs';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  formatCommand,
  logConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import {
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';
import { PackmindLockFile } from '@packmind/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

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
  }

  merged.missingAccess = [...new Set(merged.missingAccess)];

  const urlsFromResultsWithMissingAccess = results
    .filter((r) => r.missingAccess.length > 0)
    .map((r) => r.joinSpaceUrl);
  const uniqueUrls = new Set(urlsFromResultsWithMissingAccess.filter(Boolean));
  if (
    uniqueUrls.size === 1 &&
    !urlsFromResultsWithMissingAccess.some((u) => u === undefined)
  ) {
    merged.joinSpaceUrl = [...uniqueUrls][0];
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

async function notifyArtefactsDistributionIfInGitRepo(params: {
  packmindCliHexa: PackmindCliHexa;
  dir: string;
}): Promise<void> {
  const { packmindCliHexa, dir } = params;
  try {
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(dir);
    if (!gitRoot) return;

    const lockFilePath = path.join(dir, 'packmind-lock.json');
    const content = fs.readFileSync(lockFilePath, 'utf-8');
    const packmindLockFile = JSON.parse(content) as PackmindLockFile;

    const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
    const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

    let relativePath = dir.startsWith(gitRoot)
      ? dir.slice(gitRoot.length)
      : '/';
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    if (!relativePath.endsWith('/')) {
      relativePath = relativePath + '/';
    }

    await packmindCliHexa.notifyArtefactsDistribution({
      gitRemoteUrl,
      gitBranch,
      relativePath,
      packmindLockFile,
    });
  } catch {
    // Silently ignore all errors to not fail the install
  }
}

async function installDefaultSkillsIfAtGitRoot(params: {
  packmindCliHexa: PackmindCliHexa;
  cwd: string;
}): Promise<void> {
  const { packmindCliHexa, cwd } = params;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

  if (!gitRoot || cwd !== gitRoot) {
    return;
  }

  try {
    logConsole('\nInstalling default skills...');
    const skillsResult = await packmindCliHexa.installDefaultSkills({
      cliVersion: CLI_VERSION,
      baseDirectory: cwd,
    });

    if (skillsResult.errors.length > 0) {
      skillsResult.errors.forEach((err) => {
        logWarningConsole(`Warning: ${err}`);
      });
    }

    const totalSkillFiles =
      skillsResult.filesCreated + skillsResult.filesUpdated;
    if (totalSkillFiles > 0) {
      logConsole(
        `Default skills: added ${skillsResult.filesCreated} files, changed ${skillsResult.filesUpdated} files`,
      );
    } else if (skillsResult.errors.length === 0) {
      logConsole('Default skills are already up to date');
    }
  } catch {
    // Silently ignore default skills installation errors as it's a secondary operation
  }
}

export async function installHandler({
  installPath,
  packages,
  list,
  show,
  status,
  skipInstalledAt,
}: {
  installPath: string;
  packages: string[];
  list: boolean;
  show: string;
  status: boolean;
  skipInstalledAt: boolean;
}): Promise<void> {
  const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
  const packmindCliHexa = new PackmindCliHexa(packmindLogger);

  if (status) {
    const deps: InstallHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
    };
    await statusHandler({}, deps);
    return;
  }

  if (list) {
    logErrorConsole('Command "packmind-cli install --list" has been removed.');
    logConsole(`Use ${formatCommand('packmind-cli packages list')} instead.`);
    process.exit(1);
  }

  if (show) {
    const showCommand = `packmind-cli packages show ${show}`;
    logErrorConsole('Command "packmind-cli install --show" has been removed.');
    logConsole(`Use ${formatCommand(showCommand)} instead.`);
    process.exit(1);
  }

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
  } else if (packages.length > 0) {
    // With explicit packages: only update the cwd's packmind.json
    targetDirs = [cwd];
  } else {
    // Without -p and without explicit packages: include root if it has packmind.json, then recursively find sub-directories
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
      const result = await packmindCliHexa.install({
        baseDirectory: dir,
        packages: packages.length > 0 ? packages : undefined,
        skipInstalledAt,
      });
      results.push(result);

      await notifyArtefactsDistributionIfInGitRepo({
        packmindCliHexa,
        dir,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      thrownErrors.push(
        multiDir
          ? `[${dir}] install failed: ${errorMessage}`
          : `install failed: ${errorMessage}`,
      );
    }
  }

  const combined = mergeInstallResults(results);

  if (combined.missingAccess.length > 0) {
    let warning =
      `⚠️  You don't have access to the following packages (their artifacts were preserved from the lock file):\n` +
      combined.missingAccess.map((s) => `  - ${s}`).join('\n');

    if (combined.joinSpaceUrl) {
      warning += `\n\n  👉 Join the space to get access: ${combined.joinSpaceUrl}`;
    }

    logWarningConsole(warning);
  }

  logConsole(buildInstallSummary(combined));

  await installDefaultSkillsIfAtGitRoot({ packmindCliHexa, cwd });

  const allErrors = [...combined.errors, ...thrownErrors];

  if (allErrors.length > 0) {
    logWarningConsole(`Encountered ${allErrors.length} error(s):`);
    allErrors.forEach((err) => logErrorConsole(`  - ${err}`));
  }

  if (thrownErrors.length > 0) {
    process.exit(1);
  }
}

export const installCommand = command({
  name: 'install',
  aliases: ['pull'],
  description: 'Install packages and save their artifacts locally',
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
    status: flag({
      long: 'status',
      description:
        'Show status of all packmind.json files and their packages in the workspace',
    }),
    list: flag({
      long: 'list',
      description: '[Deprecated] List available packages',
    }),
    show: option({
      type: string,
      long: 'show',
      description: '[Deprecated] Show details of a specific package',
      defaultValue: () => '',
    }),
    skipInstalledAt: flag({
      long: 'skip-installed-at',
      description:
        'Omit the installedAt timestamp from the packmind-lock.json file',
    }),
  },
  handler: installHandler,
});
